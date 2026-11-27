import type { Locale } from '../types/canvas';

export interface StudioLabels {
  designMode: string;
  prototypeMode: string;
  devMode: string;
  presentBtn: string;
  enterpriseBtn: string;
  snapshotsBtn: string;
  templates: string;
  exportBtn: string;
  layersTitle: string;
  assetsTitle: string;
  searchLayersPlaceholder: string;
  designTab: string;
  tokensTab: string;
  codeInspector: string;
  prototypeInspector: string;
  artboardLabel: string;
  layoutSection: string;
  autoLayoutSection: string;
  vectorPathSection: string;
  wcagSection: string;
  appearanceSection: string;
  fillSection: string;
  strokeSection: string;
  typographySection: string;
  alignSection: string;
  brandThemesTitle: string;
  semanticTokensTitle: string;
  tokenPrimitivesTitle: string;
  tokenTypographyTitle: string;
  tokenSpacingTitle: string;
  tokenRadiusTitle: string;
  tokenShadowsTitle: string;
  commandPlaceholder: string;
  simulateCoDesigner: string;
  coDesignerLive: string;
  yjsSynced: string;
  fitScreen: string;
  copyCode: string;
  downloadCode: string;
  copied: string;
  redlineSpecs: string;
  exportStudioTitle: string;
  noSelectionHint: string;
  canvasHint: string;
  penHint: string;
  savedLocally: string;
  stack3dBtn: string;
  measureBtn: string;
  smartGuidesBtn: string;
  grid8pxBtn: string;
  photoGradingSection: string;
  compileTokensBtn: string;
  liveCollabLabel: string;
}

export const LABELS: Record<Locale, StudioLabels> = {
  en: {
    designMode: 'DESIGN',
    prototypeMode: 'PROTOTYPE',
    devMode: 'DEV MODE',
    presentBtn: 'Present Prototype',
    enterpriseBtn: 'Enterprise Pro',
    snapshotsBtn: 'History',
    templates: 'Templates',
    exportBtn: 'Export',
    layersTitle: 'Layers',
    assetsTitle: 'Assets',
    searchLayersPlaceholder: 'Filter layers...',
    designTab: 'Design',
    tokensTab: 'Tokens Studio',
    codeInspector: 'Dev Codegen v4',
    prototypeInspector: 'Motion & Flows',
    artboardLabel: 'Artboard Frame',
    layoutSection: 'Layout & Transform',
    autoLayoutSection: 'Auto-Layout Flex / Grid',
    vectorPathSection: 'Vector Bezier Path',
    wcagSection: 'WCAG 2.1 Contrast Audit',
    appearanceSection: 'Appearance & Glass',
    fillSection: 'Fill',
    strokeSection: 'Stroke',
    typographySection: 'Typography',
    alignSection: 'Align',
    brandThemesTitle: 'Instant Theme System',
    semanticTokensTitle: 'Semantic Color Variables',
    tokenPrimitivesTitle: 'Color Primitives',
    tokenTypographyTitle: 'Typography Scale',
    tokenSpacingTitle: 'Spacing Grid',
    tokenRadiusTitle: 'Border Radius Scale',
    tokenShadowsTitle: 'Shadow Elevations',
    commandPlaceholder:
      'Type a design command (e.g. "Cyber Emerald", "8px Grid", "Enterprise License", "Present")...',
    simulateCoDesigner: 'Co-Designer',
    coDesignerLive: 'Linh Live',
    yjsSynced: 'Yjs CRDT',
    fitScreen: 'Fit',
    copyCode: 'Copy',
    downloadCode: 'Download',
    copied: 'Copied',
    redlineSpecs: 'Artboard Redlines',
    exportStudioTitle: 'Export Studio v4.0 PRO',
    noSelectionHint:
      'Editing Artboard Frame & Auto-Layout. Click any element or drop a local photo onto canvas.',
    canvasHint: 'Alt+Hover Measure · 8px Grid · Drop Photo · Right-Click Menu',
    penHint:
      'Pen Active: Click to plot points · Enter / Double-Click Finish · Esc Cancel',
    savedLocally: 'Saved',
    stack3dBtn: '3D Stack',
    measureBtn: 'Measure',
    smartGuidesBtn: 'Guides',
    grid8pxBtn: '8px Grid',
    photoGradingSection: 'Photo & GPU Grading',
    compileTokensBtn: 'Compile',
    liveCollabLabel: 'Live Collab',
  },
  vi: {
    designMode: 'THIẾT KẾ',
    prototypeMode: 'PROTOTYPE',
    devMode: 'DEV MODE',
    presentBtn: 'Trình chiếu',
    enterpriseBtn: 'Bản quyền Pro',
    snapshotsBtn: 'Lịch sử',
    templates: 'Mẫu chuẩn',
    exportBtn: 'Xuất file',
    layersTitle: 'Lớp',
    assetsTitle: 'Thư viện',
    searchLayersPlaceholder: 'Tìm lớp...',
    designTab: 'Thuộc tính',
    tokensTab: 'Tokens Studio',
    codeInspector: 'Xuất Code v4',
    prototypeInspector: 'Chuyển động & Luồng',
    artboardLabel: 'Khung Artboard',
    layoutSection: 'Vị trí & Kích thước',
    autoLayoutSection: 'Auto-Layout Flex / Grid',
    vectorPathSection: 'Đường cong Vector Bezier',
    wcagSection: 'Kiểm định Tương phản WCAG 2.1',
    appearanceSection: 'Hiển thị & Kính mờ',
    fillSection: 'Màu nền (Fill)',
    strokeSection: 'Viền (Stroke)',
    typographySection: 'Kiểu chữ',
    alignSection: 'Căn chỉnh',
    brandThemesTitle: 'Chuyển đổi Hệ Theme tức thì',
    semanticTokensTitle: 'Biến Màu Ngữ nghĩa',
    tokenPrimitivesTitle: 'Bảng Màu Gốc (Primitives)',
    tokenTypographyTitle: 'Thang Kiểu chữ',
    tokenSpacingTitle: 'Lưới Khoảng cách (Spacing)',
    tokenRadiusTitle: 'Thang Bo góc (Radius)',
    tokenShadowsTitle: 'Độ nổi Đổ bóng (Elevations)',
    commandPlaceholder:
      'Nhập lệnh thiết kế (vd: "Cyber Emerald", "8px Grid", "Enterprise License", "Present")...',
    simulateCoDesigner: 'Đồng đội AI',
    coDesignerLive: 'Linh Trực tuyến',
    yjsSynced: 'Yjs CRDT',
    fitScreen: 'Vừa khung',
    copyCode: 'Sao chép',
    downloadCode: 'Tải về',
    copied: 'Đã chép',
    redlineSpecs: 'Đo khoảng cách Artboard',
    exportStudioTitle: 'Trung tâm Xuất bản v4.0 PRO',
    noSelectionHint:
      'Đang chỉnh Artboard & Auto-Layout. Chọn phần tử hoặc kéo thả ảnh từ máy tính lên bảng vẽ.',
    canvasHint: 'Giữ Alt để đo · Lưới 8px · Kéo thả Ảnh · Chuột phải Menu',
    penHint:
      'Đang dùng bút Pen: Nhấp chọn điểm · Enter / Nhấp đúp hoàn tất · Esc hủy',
    savedLocally: 'Đã lưu',
    stack3dBtn: '3D Stack',
    measureBtn: 'Đo px',
    smartGuidesBtn: 'Đường gióng',
    grid8pxBtn: 'Lưới 8px',
    photoGradingSection: 'Ảnh & Bộ lọc GPU',
    compileTokensBtn: 'Biên dịch',
    liveCollabLabel: 'Live Collab',
  },
};
