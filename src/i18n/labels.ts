import type { Locale } from '../types/canvas';

export interface StudioLabels {
  designMode: string;
  devMode: string;
  templates: string;
  exportBtn: string;
  layersTitle: string;
  designTab: string;
  tokensTab: string;
  codeInspector: string;
  artboardLabel: string;
  layoutSection: string;
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
}

export const LABELS: Record<Locale, StudioLabels> = {
  en: {
    designMode: 'DESIGN',
    devMode: 'DEV MODE',
    templates: 'Templates',
    exportBtn: 'Export',
    layersTitle: 'Layers',
    designTab: 'Design',
    tokensTab: 'Tokens',
    codeInspector: 'Dev Codegen',
    artboardLabel: 'Artboard',
    layoutSection: 'Layout & Transform',
    appearanceSection: 'Appearance & Glass',
    fillSection: 'Fill',
    strokeSection: 'Stroke',
    typographySection: 'Typography',
    alignSection: 'Align',
    brandThemesTitle: 'Brand Theme Morphs',
    semanticTokensTitle: 'Live Semantic Tokens',
    commandPlaceholder: 'Type a design command (e.g. "Add glass pricing card", "Swiss Vermilion")...',
    simulateCoDesigner: 'Simulate Co-Designer',
    coDesignerLive: 'Linh Live',
    yjsSynced: 'Yjs CRDT Synced',
    fitScreen: 'Fit',
    copyCode: 'Copy Code',
    copied: 'Copied',
    redlineSpecs: 'Artboard Redlines',
    exportStudioTitle: 'Export Studio',
    noSelectionHint: 'Editing Artboard Frame. Click any element on canvas to inspect.',
    canvasHint: 'Space+Drag Pan · Shift Select · Double-Click Text',
  },
  vi: {
    designMode: 'THIẾT KẾ',
    devMode: 'DEV MODE',
    templates: 'Mẫu chuẩn',
    exportBtn: 'Xuất file',
    layersTitle: 'Lớp (Layers)',
    designTab: 'Thuộc tính',
    tokensTab: 'Tokens',
    codeInspector: 'Xuất Code',
    artboardLabel: 'Khung Artboard',
    layoutSection: 'Vị trí & Kích thước',
    appearanceSection: 'Hiển thị & Kính mờ',
    fillSection: 'Màu nền (Fill)',
    strokeSection: 'Viền (Stroke)',
    typographySection: 'Kiểu chữ',
    alignSection: 'Căn chỉnh',
    brandThemesTitle: 'Biến hình Hệ màu Thương hiệu',
    semanticTokensTitle: 'Token Ngữ nghĩa Trực tiếp',
    commandPlaceholder: 'Nhập lệnh thiết kế (vd: "Add glass pricing card", "Swiss Vermilion")...',
    simulateCoDesigner: 'Giả lập Đồng đội',
    coDesignerLive: 'Linh Trực tuyến',
    yjsSynced: 'Đồng bộ Yjs CRDT',
    fitScreen: 'Vừa khung',
    copyCode: 'Sao chép',
    copied: 'Đã chép',
    redlineSpecs: 'Đo khoảng cách Artboard',
    exportStudioTitle: 'Trung tâm Xuất bản',
    noSelectionHint: 'Đang chỉnh khung Artboard. Chọn phần tử bất kỳ để hiệu chỉnh.',
    canvasHint: 'Space + Kéo để di chuyển  ·  Shift chọn nhiều  ·  Nhấp đúp sửa chữ',
  },
};
