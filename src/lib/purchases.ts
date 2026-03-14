import Purchases, { LOG_LEVEL, PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Product identifiers — must match App Store Connect / Google Play exactly
export const PRODUCT_IDS = {
  PRO_MONTHLY:   'pushd_pro_monthly',
  PRO_YEARLY:    'pushd_pro_yearly',
  ELITE_MONTHLY: 'pushd_elite_monthly',
  ELITE_YEARLY:  'pushd_elite_yearly',
} as const;

// RevenueCat offering identifier
export const OFFERING_ID = 'default';

export function initPurchases(userId?: string) {
  const apiKey = Constants.expoConfig?.extra?.revenueCatApiKey as string | undefined;

  if (!apiKey) {
    console.warn('[Purchases] RevenueCat API key not configured');
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  if (Platform.OS === 'ios') {
    Purchases.configure({ apiKey, appUserID: userId ?? null });
  } else if (Platform.OS === 'android') {
    Purchases.configure({ apiKey, appUserID: userId ?? null });
  }
}

export async function identifyUser(userId: string) {
  try {
    await Purchases.logIn(userId);
  } catch (err) {
    console.warn('[Purchases] Failed to identify user:', err);
  }
}

export async function resetUser() {
  try {
    await Purchases.logOut();
  } catch {
    // ignore — may already be anonymous
  }
}

export async function getOfferings() {
  const offerings = await Purchases.getOfferings();
  return offerings.current ?? offerings.all[OFFERING_ID] ?? null;
}

export async function purchasePackage(pkg: PurchasesPackage) {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases() {
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo;
}

export function getActiveTierFromCustomerInfo(
  customerInfo: import('react-native-purchases').CustomerInfo,
): 'FREE' | 'PRO' | 'ELITE' {
  const entitlements = customerInfo.entitlements.active;
  if (entitlements['elite']) return 'ELITE';
  if (entitlements['pro']) return 'PRO';
  return 'FREE';
}
