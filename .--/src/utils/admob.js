// AdMob banner for the Android/iOS app. The website uses AdSense instead.
import { Capacitor } from '@capacitor/core';
import { AdMob, AdmobConsentStatus, BannerAdPluginEvents, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';

// Google's public demo units, used while no real ad unit ID is saved in Admin Settings.
var TEST_BANNER_IDS = {
  android: 'ca-app-pub-3940256099942544/6300978111',
  ios: 'ca-app-pub-3940256099942544/2934735716',
};

var wantedAdId = '';   // '' means no banner should exist
var shownAdId = '';    // ad unit of the banner that currently exists
var hidden = false;
var bannerHeight = 0;
var ready = null;
var queue = Promise.resolve();

// The banner is a native view drawn over the web page, so the page has to
// make room for it. --admob-h is used by index.css and the chat button.
function setSpace(height) {
  document.documentElement.style.setProperty('--admob-h', height + 'px');
}

// Full-screen popups have buttons at the bottom that the banner would cover.
function popupIsOpen() {
  return Array.prototype.some.call(document.querySelectorAll('[style*="position: fixed"]'), function(el) {
    var box = el.getBoundingClientRect();
    return box.width >= window.innerWidth * 0.9 && box.height >= window.innerHeight * 0.9;
  });
}

async function prepare() {
  var consent = await AdMob.requestConsentInfo();
  if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
    consent = await AdMob.showConsentForm();
  }
  if (!consent.canRequestAds) throw new Error('Ad consent not given');
  if (Capacitor.getPlatform() === 'ios') {
    var tracking = await AdMob.trackingAuthorizationStatus();
    if (tracking.status === 'notDetermined') await AdMob.requestTrackingAuthorization();
  }
  await AdMob.initialize();
  await AdMob.addListener(BannerAdPluginEvents.SizeChanged, function(size) {
    bannerHeight = size.height || 0;
    setSpace(hidden ? 0 : bannerHeight);
  });
  new MutationObserver(sync).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
}

async function apply() {
  if (shownAdId && shownAdId !== wantedAdId) {
    await AdMob.removeBanner();
    shownAdId = '';
    hidden = false;
    setSpace(0);
  }
  if (!wantedAdId) return;
  if (!ready) ready = prepare().catch(function(e) { ready = null; throw e; });
  await ready;
  var shouldHide = popupIsOpen();
  if (!shownAdId) {
    if (shouldHide) return;
    var adId = wantedAdId;
    await AdMob.showBanner({
      adId: adId,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: adId === TEST_BANNER_IDS[Capacitor.getPlatform()],
    });
    shownAdId = adId;
  } else if (shouldHide !== hidden) {
    hidden = shouldHide;
    if (shouldHide) await AdMob.hideBanner();
    else await AdMob.resumeBanner();
    setSpace(shouldHide ? 0 : bannerHeight);
  }
}

// Plugin calls run one at a time so a quick open/close can't overlap.
function sync() {
  queue = queue.then(apply).catch(function(e) { console.warn('AdMob:', e.message || e); });
}

// config is the admob_config setting: { enabled, android_banner_id, ios_banner_id }
export function updateAdMobBanner(adsEnabled, config) {
  if (!Capacitor.isNativePlatform()) return;
  var platform = Capacitor.getPlatform();
  var on = adsEnabled && config && config.enabled === true;
  wantedAdId = on ? (config[platform + '_banner_id'] || TEST_BANNER_IDS[platform]) : '';
  sync();
}
