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
  savedLocally: string;
  stack3dBtn: string;
  measureBtn: string;
  photoGradingSection: string;
}

export const LABELS: Record<Locale, StudioLabels> = {
  en: {
    designMode: 'DESIGN',
    prototypeMode: 'PROTOTYPE',
    devMode: 'DEV MODE',
    presentBtn: 'Present',
    snapshotsBtn: 'File & History',
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
    commandPlaceholder: 'Type a design command (e.g. "Luxury Editorial", "3D Stack", "Present")...',
    simulateCoDesigner: 'Co-Designer',
    coDesignerLive: 'Linh Live',
    yjsSynced: 'Yjs CRDT',
    fitScreen: 'Fit',
    copyCode: 'Copy Code',
    copied: 'Copied',
    redlineSpecs: 'Artboard Redlines',
    exportStudioTitle: 'Export Studio v3',
    noSelectionHint: 'Editing Artboard Frame. Click any element or drop a local photo onto canvas.',
    canvasHint: 'Alt+Hover Measure · Drop Photo · Right-Click Menu',
    penHint: 'Pen Active: Click to plot points · Enter / Double-Click Finish · Esc Cancel',
    savedLocally: 'Saved',
    stack3dBtn: '3D Stack',
    measureBtn: 'Measure',
    photoGradingSection: 'Photo & GPU Grading',
  },
  vi: {
    designMode: 'THIẾT KẾ',
    prototypeMode: 'PROTOTYPE',
    devMode: 'DEV MODE',
    presentBtn: 'Trình chiếu',
    snapshotsBtn: 'Tệp & Lịch sử',
    templates: 'Mẫu chuẩn',
    exportBtn: 'Xuất file',
    layersTitle: 'Lớp',
    assetsTitle: 'Thư viện',
    searchLayersPlaceholder: 'Tìm lớp...',
    designTab: 'Thuộc tính',
    tokensTab: 'Tokens',
    codeInspector: 'Xuất Code',
    prototypeInspector: 'Chuyển động & Luồng',
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
    commandPlaceholder: 'Nhập lệnh thiết kế (vd: "Luxury Editorial", "3D Stack", "Present")...',
    simulateCoDesigner: 'Đồng đội AI',
    coDesignerLive: 'Linh Trực tuyến',
    yjsSynced: 'Yjs CRDT',
    fitScreen: 'Vừa khung',
    copyCode: 'Sao chép',
    copied: 'Đã chép',
    redlineSpecs: 'Đo khoảng cách Artboard',
    exportStudioTitle: 'Trung tâm Xuất bản v3',
    noSelectionHint: 'Đang chỉnh Artboard. Chọn phần tử hoặc kéo thả ảnh từ máy tính lên bảng vẽ.',
    canvasHint: 'Giữ Alt để đo · Kéo thả Ảnh · Chuột phải Menu nhanh',
    penHint: 'Đang dùng bút Pen: Nhấp chọn điểm · Enter / Nhấp đúp hoàn tất · Esc hủy',
    savedLocally: 'Đã lưu',
    stack3dBtn: '3D Stack',
    measureBtn: 'Đo px',
    photoGradingSection: 'Ảnh & Bộ lọc GPU',
  },
};
