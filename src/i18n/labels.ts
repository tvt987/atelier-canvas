import type { Locale } from '../types/canvas';

export interface StudioLabels {
  designMode: string;
  prototypeMode: string;
  devMode: string;
  presentBtn: string;
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
  commandPlaceholder: string;
  simulateCoDesigner: string;
  coDesignerLive: string;
  yjsSynced: string;
  fitScreen: string;
  copyCode: string;
  copied: string;
  redlineSpecs: string;
  exportStudioTitle: string;
  noSelectionHint: string;
  canvasHint: string;
  penHint: string;
}

export const LABELS: Record<Locale, StudioLabels> = {
  en: {
    designMode: 'DESIGN',
    prototypeMode: 'PROTOTYPE',
    devMode: 'DEV MODE',
    presentBtn: 'Present',
    snapshotsBtn: 'Versions',
    templates: 'Templates',
    exportBtn: 'Export',
    layersTitle: 'Layers',
    assetsTitle: 'Assets',
    searchLayersPlaceholder: 'Filter layers...',
    designTab: 'Design',
    tokensTab: 'Tokens',
    codeInspector: 'Dev Codegen',
    prototypeInspector: 'Motion & Flows',
    artboardLabel: 'Artboard',
    layoutSection: 'Layout & Transform',
    autoLayoutSection: 'Auto-Layout Flex',
    vectorPathSection: 'Vector Bezier Path',
    wcagSection: 'WCAG 2.1 Contrast Audit',
    appearanceSection: 'Appearance & Glass',
    fillSection: 'Fill',
    strokeSection: 'Stroke',
    typographySection: 'Typography',
    alignSection: 'Align',
    brandThemesTitle: 'Brand Theme Morphs',
    semanticTokensTitle: 'Live Semantic Tokens',
    commandPlaceholder: 'Type a design command (e.g. "glass pricing", "KPI sparkline", "Present")...',
    simulateCoDesigner: 'Co-Designer',
    coDesignerLive: 'Linh Live',
    yjsSynced: 'Yjs CRDT Synced',
    fitScreen: 'Fit',
    copyCode: 'Copy Code',
    copied: 'Copied',
    redlineSpecs: 'Artboard Redlines',
    exportStudioTitle: 'Export Studio v2',
    noSelectionHint: 'Editing Artboard Frame. Click any element on canvas to inspect.',
    canvasHint: 'Space+Drag Pan · P Pen Curve · Right-Click Context Menu',
    penHint: 'Pen Active: Click to plot points · Enter / Double-Click Finish · Esc Cancel',
  },
  vi: {
    designMode: 'THIẾT KẾ',
    prototypeMode: 'PROTOTYPE',
    devMode: 'DEV MODE',
    presentBtn: 'Trình chiếu',
    snapshotsBtn: 'Phiên bản',
    templates: 'Mẫu chuẩn',
    exportBtn: 'Xuất file',
    layersTitle: 'Lớp',
    assetsTitle: 'Thư viện',
    searchLayersPlaceholder: 'Tìm lớp...',
    designTab: 'Thuộc tính',
    tokensTab: 'Tokens',
    codeInspector: 'Xuất Code',
    prototypeInspector: 'Chuyển động & Tương tác',
    artboardLabel: 'Khung Artboard',
    layoutSection: 'Vị trí & Kích thước',
    autoLayoutSection: 'Auto-Layout Flex',
    vectorPathSection: 'Đường cong Vector Bezier',
    wcagSection: 'Kiểm định Tương phản WCAG 2.1',
    appearanceSection: 'Hiển thị & Kính mờ',
    fillSection: 'Màu nền (Fill)',
    strokeSection: 'Viền (Stroke)',
    typographySection: 'Kiểu chữ',
    alignSection: 'Căn chỉnh',
    brandThemesTitle: 'Biến hình Hệ màu Thương hiệu',
    semanticTokensTitle: 'Token Ngữ nghĩa Trực tiếp',
    commandPlaceholder: 'Nhập lệnh thiết kế (vd: "glass pricing", "KPI sparkline", "Present")...',
    simulateCoDesigner: 'Đồng đội AI',
    coDesignerLive: 'Linh Trực tuyến',
    yjsSynced: 'Đồng bộ Yjs CRDT',
    fitScreen: 'Vừa khung',
    copyCode: 'Sao chép',
    copied: 'Đã chép',
    redlineSpecs: 'Đo khoảng cách Artboard',
    exportStudioTitle: 'Trung tâm Xuất bản v2',
    noSelectionHint: 'Đang chỉnh khung Artboard. Chọn phần tử bất kỳ để hiệu chỉnh.',
    canvasHint: 'Space+Kéo di chuyển · P Vẽ đường cong · Chuột phải Menu nhanh',
    penHint: 'Đang dùng bút Pen: Nhấp chọn điểm · Enter / Nhấp đúp hoàn tất · Esc hủy',
  },
};
