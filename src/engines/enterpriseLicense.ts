export const ENTERPRISE_LICENSE_CONFIG = {
  productName: 'Atelier Canvas Pro v4.0',
  edition: 'Enterprise Super VIP Pro',
  studioBrand: 'TVT Studio',
  priceVnd: 13_900_000,
  priceDisplay: '13.900.000 VND',
  bankName: 'MBBank',
  bankFullName: 'Military Commercial Joint Stock Bank (MB)',
  bankBin: '970422',
  accountNumber: '0325456574',
  accountHolder: 'TRUONG VAN TINH',
  defaultMemo: 'ATELIER CANVAS V4 PRO',
} as const;

export interface VietQrOptions {
  amount?: number;
  addInfo?: string;
  accountName?: string;
  template?: 'compact2' | 'compact' | 'qr_only';
}

export function buildEnterpriseVietQrUrl(options: VietQrOptions = {}): string {
  const amount = options.amount ?? ENTERPRISE_LICENSE_CONFIG.priceVnd;
  const addInfo = options.addInfo ?? ENTERPRISE_LICENSE_CONFIG.defaultMemo;
  const accountName =
    options.accountName ?? ENTERPRISE_LICENSE_CONFIG.accountHolder;
  const template = options.template ?? 'compact2';
  const base = `https://img.vietqr.io/image/${ENTERPRISE_LICENSE_CONFIG.bankBin}-${ENTERPRISE_LICENSE_CONFIG.accountNumber}-${template}.png`;
  const params = new URLSearchParams({
    amount: String(amount),
    addInfo,
    accountName,
  });
  return `${base}?${params.toString()}`;
}

export function validateEnterpriseLicenseKey(rawKey: string): {
  valid: boolean;
  normalized: string;
  reason?: string;
} {
  const normalized = rawKey.trim().toUpperCase();
  if (!normalized) {
    return { valid: false, normalized, reason: 'Please enter a license key.' };
  }
  const pattern = /^TVT-ACV4-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  if (!pattern.test(normalized)) {
    return {
      valid: false,
      normalized,
      reason: 'Expected format: TVT-ACV4-XXXX-XXXX',
    };
  }
  return { valid: true, normalized };
}
