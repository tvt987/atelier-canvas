import { useMemo, useState } from 'react';
import {
  Building2,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  QrCode,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import type { Locale } from '../types/canvas';
import {
  buildEnterpriseVietQrUrl,
  ENTERPRISE_LICENSE_CONFIG,
  validateEnterpriseLicenseKey,
} from '../engines/enterpriseLicense';

interface EnterpriseLicenseModalProps {
  open: boolean;
  onClose: () => void;
  locale: Locale;
}

const FEATURES_EN = [
  'Design Tokens Studio (Primitives, Semantic, Type Scale, Spacing, Radii, Shadows)',
  'Instant W3C DTCG JSON & CSS Custom Properties Export',
  'Responsive Breakpoint Viewports (1440 / 768 / 390 / Fluid) & 8px Grid',
  'CSS Flexbox & Grid Auto-Layout Inspector with Live Code Preview',
  'Interactive Click-Through Prototype Player (Navigate, Smart Animate, Modal)',
  'Production React 19 + Tailwind CSS v4 + Clean SVG Codegen',
  'Full Commercial Source Rights & TVT Studio Enterprise Support',
];

const FEATURES_VI = [
  'Design Tokens Studio (Màu gốc, Biến ngữ nghĩa, Thang chữ, Lưới 8px, Bo góc, Đổ bóng)',
  'Xuất trực tiếp W3C Design Tokens JSON & CSS Custom Properties',
  'Khung hiển thị Responsive (1440 / 768 / 390 / Fluid) & Lưới 8px chuẩn xác',
  'Trình điều khiển Auto-Layout CSS Flexbox & Grid trực quan thời gian thực',
  'Trình chiếu Prototype tương tác (Chuyển màn hình, Smart Animate, Modal Overlay)',
  'Xuất mã nguồn React 19 + Tailwind CSS v4 + Clean SVG sẵn sàng Production',
  'Bản quyền thương mại trọn đời & Hỗ trợ Kiến trúc từ TVT Studio',
];

export function EnterpriseLicenseModal({
  open,
  onClose,
  locale,
}: EnterpriseLicenseModalProps) {
  const [copiedField, setCopiedField] = useState<'account' | 'memo' | null>(null);
  const [licenseInput, setLicenseInput] = useState('');
  const [activationMsg, setActivationMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [qrLoadError, setQrLoadError] = useState(false);

  const vietQrUrl = useMemo(() => buildEnterpriseVietQrUrl(), []);

  if (!open) return null;

  const isVi = locale === 'vi';
  const features = isVi ? FEATURES_VI : FEATURES_EN;

  const copyValue = async (value: string, field: 'account' | 'memo') => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Ignore clipboard failure in restricted contexts
    }
    setCopiedField(field);
    window.setTimeout(() => setCopiedField(null), 1600);
  };

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateEnterpriseLicenseKey(licenseInput);
    if (check.valid) {
      setActivationMsg({
        ok: true,
        text: isVi
          ? `Đã xác thực khóa bản quyền ${check.normalized} — Enterprise Active`
          : `Verified license ${check.normalized} — Enterprise Studio Active`,
      });
    } else {
      setActivationMsg({
        ok: false,
        text: check.reason ?? 'Invalid license key format.',
      });
    }
  };

  return (
    <div
      data-testid="enterprise-license-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md overflow-y-auto"
    >
      <div
        data-testid="enterprise-license-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden my-auto"
        style={{
          backgroundColor: 'var(--studio-surface)',
          borderColor: 'var(--studio-border-strong)',
        }}
      >
        {/* Top Executive Bar */}
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between gap-3"
          style={{
            borderColor: 'var(--studio-border)',
            background:
              'linear-gradient(135deg, rgba(99,102,241,0.16), rgba(16,185,129,0.10))',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0"
              style={{
                background:
                  'linear-gradient(135deg, rgba(99,102,241,0.28), rgba(6,182,212,0.22))',
                borderColor: 'rgba(99,102,241,0.55)',
              }}
            >
              <ShieldCheck size={18} className="text-cyan-300" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-bold text-sm sm:text-base tracking-tight">
                  {ENTERPRISE_LICENSE_CONFIG.productName}
                </span>
                <span className="font-mono-tech text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/45 text-emerald-300">
                  {ENTERPRISE_LICENSE_CONFIG.edition}
                </span>
              </div>
              <p
                className="text-[11px] truncate"
                style={{ color: 'var(--studio-text-secondary)' }}
              >
                {isVi
                  ? 'Bản quyền Doanh nghiệp trọn đời · TVT Studio Flagship Architecture'
                  : 'Perpetual Commercial Enterprise Studio License · TVT Studio Flagship'}
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="btn-enterprise-close"
            onClick={onClose}
            aria-label="Close enterprise license modal"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 cursor-pointer shrink-0"
            style={{ color: 'var(--studio-text-secondary)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body Grid */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left: Price + Entitlements + Key Verification */}
          <div className="md:col-span-7 flex flex-col justify-between gap-4">
            <div className="space-y-4">
              {/* Price Card */}
              <div
                className="p-4 rounded-xl border flex items-center justify-between gap-4"
                style={{
                  backgroundColor: 'var(--studio-surface-2)',
                  borderColor: 'rgba(99,102,241,0.35)',
                }}
              >
                <div>
                  <div
                    className="font-mono-tech text-[10px] uppercase tracking-widest"
                    style={{ color: 'var(--studio-text-muted)' }}
                  >
                    {isVi ? 'GÓI ENTERPRISE TRỌN ĐỜI' : 'PERPETUAL ENTERPRISE LICENSE'}
                  </div>
                  <div
                    data-testid="enterprise-price"
                    className="font-display font-bold text-2xl sm:text-3xl tracking-tight mt-0.5"
                    style={{ color: 'var(--studio-text)' }}
                  >
                    {ENTERPRISE_LICENSE_CONFIG.priceDisplay}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/40 font-mono-tech text-[10px] font-semibold text-indigo-300">
                    <Sparkles size={11} />
                    <span>{isVi ? 'Thanh toán 1 lần' : 'One-Time Payment'}</span>
                  </span>
                  <div
                    className="font-mono-tech text-[10px] mt-1"
                    style={{ color: 'var(--studio-text-muted)' }}
                  >
                    {isVi ? 'Không phí gia hạn hàng tháng' : 'Zero recurring SaaS fees'}
                  </div>
                </div>
              </div>

              {/* Feature List */}
              <div className="space-y-2">
                <div
                  className="font-mono-tech text-[10px] uppercase tracking-wider font-semibold"
                  style={{ color: 'var(--studio-text-muted)' }}
                >
                  {isVi ? 'ĐẶC QUYỀN STUDIO v4.0 PRO' : 'INCLUDED v4.0 ENTERPRISE CAPABILITIES'}
                </div>
                <ul className="space-y-1.5">
                  {features.map((feat, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-xs leading-snug"
                      style={{ color: 'var(--studio-text-secondary)' }}
                    >
                      <CheckCircle2
                        size={14}
                        className="text-emerald-400 shrink-0 mt-0.5"
                        strokeWidth={1.8}
                      />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Enterprise License Key Activation */}
            <form
              onSubmit={handleActivate}
              className="p-3 rounded-xl border space-y-2"
              style={{
                backgroundColor: 'var(--studio-surface-2)',
                borderColor: 'var(--studio-border)',
              }}
            >
              <div className="flex items-center justify-between font-mono-tech text-[10px] uppercase tracking-wider">
                <span
                  className="flex items-center gap-1.5"
                  style={{ color: 'var(--studio-text-muted)' }}
                >
                  <KeyRound size={11} />
                  <span>{isVi ? 'Kích hoạt Khóa bản quyền' : 'Activate License Key'}</span>
                </span>
                <span style={{ color: 'var(--studio-cyan)' }}>TVT-ACV4-XXXX-XXXX</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  data-testid="enterprise-license-input"
                  value={licenseInput}
                  onChange={(e) => setLicenseInput(e.target.value)}
                  placeholder="TVT-ACV4-2026-PRO1"
                  className="flex-1 h-8 px-2.5 rounded-lg border font-mono-tech text-xs uppercase outline-none"
                  style={{
                    backgroundColor: 'var(--studio-surface)',
                    borderColor: 'var(--studio-border-strong)',
                    color: 'var(--studio-text)',
                  }}
                />
                <button
                  type="submit"
                  data-testid="btn-verify-license"
                  className="h-8 px-3.5 rounded-lg text-xs font-semibold text-white cursor-pointer shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                  }}
                >
                  {isVi ? 'Xác thực' : 'Verify'}
                </button>
              </div>
              {activationMsg && (
                <div
                  data-testid="enterprise-activation-status"
                  className={`font-mono-tech text-[10px] ${
                    activationMsg.ok ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {activationMsg.text}
                </div>
              )}
            </form>
          </div>

          {/* Right: Live MBBank VietQR Checkout Panel */}
          <div
            className="md:col-span-5 rounded-xl border p-4 flex flex-col justify-between gap-3"
            style={{
              backgroundColor: 'var(--studio-surface-2)',
              borderColor: 'var(--studio-border-strong)',
            }}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 text-cyan-400">
                  <QrCode size={13} />
                  <span>VIETQR NAPAS 24/7</span>
                </span>
                <span
                  className="font-mono-tech text-[10px] px-1.5 py-0.5 rounded border"
                  style={{
                    backgroundColor: 'var(--studio-surface)',
                    borderColor: 'var(--studio-border)',
                    color: 'var(--studio-text-secondary)',
                  }}
                >
                  BIN {ENTERPRISE_LICENSE_CONFIG.bankBin}
                </span>
              </div>

              {/* Live VietQR Image Container */}
              <div className="rounded-xl bg-white p-2.5 flex items-center justify-center shadow-inner border border-slate-200 min-h-[210px]">
                {!qrLoadError ? (
                  <img
                    data-testid="mbbank-vietqr-img"
                    src={vietQrUrl}
                    alt={`MBBank VietQR ${ENTERPRISE_LICENSE_CONFIG.accountNumber} ${ENTERPRISE_LICENSE_CONFIG.accountHolder}`}
                    onError={() => setQrLoadError(true)}
                    className="w-full max-w-[228px] h-auto object-contain rounded-md"
                  />
                ) : (
                  <div className="text-center p-4 text-slate-700 space-y-1">
                    <QrCode size={42} className="mx-auto text-indigo-600" />
                    <div className="font-mono-tech text-xs font-bold">
                      MBBank · {ENTERPRISE_LICENSE_CONFIG.accountNumber}
                    </div>
                    <div className="font-mono-tech text-[11px]">
                      {ENTERPRISE_LICENSE_CONFIG.accountHolder}
                    </div>
                    <div className="font-mono-tech text-[11px] text-emerald-700 font-semibold">
                      {ENTERPRISE_LICENSE_CONFIG.priceDisplay}
                    </div>
                  </div>
                )}
              </div>

              {/* Exact Bank Transfer Details */}
              <div className="space-y-1.5 font-mono-tech text-[11px]">
                <div
                  className="px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2"
                  style={{
                    backgroundColor: 'var(--studio-surface)',
                    borderColor: 'var(--studio-border)',
                  }}
                >
                  <span className="flex items-center gap-1.5" style={{ color: 'var(--studio-text-muted)' }}>
                    <Building2 size={11} />
                    <span>{isVi ? 'Ngân hàng' : 'Bank'}</span>
                  </span>
                  <span className="font-semibold">
                    {ENTERPRISE_LICENSE_CONFIG.bankName} ({ENTERPRISE_LICENSE_CONFIG.bankBin})
                  </span>
                </div>

                <div
                  className="px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2"
                  style={{
                    backgroundColor: 'var(--studio-surface)',
                    borderColor: 'var(--studio-border)',
                  }}
                >
                  <span style={{ color: 'var(--studio-text-muted)' }}>
                    {isVi ? 'Số TK' : 'Account'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      data-testid="mbbank-account-number"
                      className="font-bold text-cyan-400"
                    >
                      {ENTERPRISE_LICENSE_CONFIG.accountNumber}
                    </span>
                    <button
                      type="button"
                      data-testid="btn-copy-account"
                      onClick={() =>
                        copyValue(ENTERPRISE_LICENSE_CONFIG.accountNumber, 'account')
                      }
                      title="Copy Account Number"
                      className="p-1 rounded hover:bg-white/10 cursor-pointer"
                      style={{ color: 'var(--studio-text-secondary)' }}
                    >
                      {copiedField === 'account' ? (
                        <Check size={11} className="text-emerald-400" />
                      ) : (
                        <Copy size={11} />
                      )}
                    </button>
                  </div>
                </div>

                <div
                  className="px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2"
                  style={{
                    backgroundColor: 'var(--studio-surface)',
                    borderColor: 'var(--studio-border)',
                  }}
                >
                  <span style={{ color: 'var(--studio-text-muted)' }}>
                    {isVi ? 'Chủ TK' : 'Holder'}
                  </span>
                  <span data-testid="mbbank-account-holder" className="font-semibold">
                    {ENTERPRISE_LICENSE_CONFIG.accountHolder}
                  </span>
                </div>

                <div
                  className="px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2"
                  style={{
                    backgroundColor: 'var(--studio-surface)',
                    borderColor: 'var(--studio-border)',
                  }}
                >
                  <span style={{ color: 'var(--studio-text-muted)' }}>
                    {isVi ? 'Nội dung' : 'Memo'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-emerald-400">
                      {ENTERPRISE_LICENSE_CONFIG.defaultMemo}
                    </span>
                    <button
                      type="button"
                      data-testid="btn-copy-memo"
                      onClick={() =>
                        copyValue(ENTERPRISE_LICENSE_CONFIG.defaultMemo, 'memo')
                      }
                      title="Copy Transfer Reference"
                      className="p-1 rounded hover:bg-white/10 cursor-pointer"
                      style={{ color: 'var(--studio-text-secondary)' }}
                    >
                      {copiedField === 'memo' ? (
                        <Check size={11} className="text-emerald-400" />
                      ) : (
                        <Copy size={11} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="text-[10px] leading-relaxed text-center pt-1 border-t"
              style={{
                color: 'var(--studio-text-muted)',
                borderColor: 'var(--studio-border)',
              }}
            >
              {isVi
                ? 'Quét mã VietQR bằng bất kỳ ứng dụng ngân hàng nào. Khóa kích hoạt và source bundle bàn giao ngay sau khi xác nhận.'
                : 'Scan VietQR with any Vietnam banking app. Enterprise source bundle & key issued immediately upon confirmation.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
