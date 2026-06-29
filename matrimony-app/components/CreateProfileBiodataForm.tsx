import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Keyboard,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SelectField, ComboBoxField } from '@/components/FormControls';
import { getPropertyDisplayValue } from '@/constants/biodataProperty';
import { FormOptionsKey, getFormOptions, getOptionLabel } from '@/constants/formOptions';
import { getLogoUri, images } from '@/constants/images';
import { Language, t, translations } from '@/constants/i18n';
import { isChristianRegistration, type RegistrationCommunityId } from '@/constants/registrationCommunities';
import {
  findHinduRegistrationStar,
  getRegistrationNatchathiramLabel,
  getRegistrationNatchathiramOptions,
  normalizeRegistrationNumber,
  normalizeRegistrationReligionValue,
  sanitizeRegistrationInput,
} from '@/constants/registrationNumbers';
import {
  previewRegistrationNumber,
  resolveRegistrationNumber,
  shouldKeepRegistrationNumber,
} from '@/lib/firestore/registrationNumberService';
import { TamilInputProvider } from '@/context/TamilInputContext';
import { useTamilTextInputProps } from '@/context/TamilInputContext';
import { useProfileForm } from '@/context/ProfileFormContext';
import { useLanguage } from '@/context/LanguageContext';
import { borderRadius, colors, fonts, spacing } from '@/constants/theme';
import { applyDefaultRegistrationCommunity, getProfileIncompleteFields, prepareProfileForPublish } from '@/constants/profileCompletion';
import { CONTACT_PHONE_KEY, normalizePhoneDigits } from '@/constants/contactDetails';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BiodataExportOptions } from '@/lib/biodataExport';
import { uploadAndSyncProfilePhotosForApproval } from '@/lib/firestore/profilePhotoSync';
import { shareBiodataSheetAsImage } from '@/lib/biodataShare';
import {
  getPhotoUploadStepLabels,
  ProfilePhotoUploadStep,
} from '@/components/ProfilePhotoUploadStep';
import {
  BIODATA_SHOW_PHOTO_KEY,
  parseBiodataShowPhoto,
  APPROVED_PROFILE_PHOTO_URLS_KEY,
  isLocalPhotoUri,
  parseProfilePhotos,
  photosForPersistence,
  PROFILE_PHOTOS_DRAFT_KEY,
  PROFILE_PHOTOS_KEY,
  resolveBiodataFormPhotoSlots,
  resolvePortableListingPhotoUri,
  serializePersistablePhotoUrls,
  serializeProfilePhotos,
} from '@/constants/profilePhotos';
import {
  resetCloudPhotoUploadAvailability,
} from '@/lib/firestore/storageService';
import { getFirebaseFirestore, getFirebaseStorage } from '@/lib/firebase';

const IS_NATIVE = Platform.OS !== 'web';

type ReviewLayoutMetrics = {
  mainLabelWidthPercent: number;
  sidebarLabelWidthPercent: number;
  stackInlinePairs: boolean;
  leftPaneFlex: number;
  rightPaneFlex: number;
};

const defaultReviewLayout: ReviewLayoutMetrics = {
  mainLabelWidthPercent: 52,
  sidebarLabelWidthPercent: 52,
  stackInlinePairs: false,
  leftPaneFlex: 1.38,
  rightPaneFlex: 1,
};

const ReviewLayoutContext = createContext<ReviewLayoutMetrics>(defaultReviewLayout);

function getReviewLayoutMetrics(screenWidth: number): ReviewLayoutMetrics {
  if (!IS_NATIVE) {
    return defaultReviewLayout;
  }

  const compact = screenWidth < 400;
  return {
    mainLabelWidthPercent: compact ? 40 : 42,
    sidebarLabelWidthPercent: compact ? 50 : 52,
    stackInlinePairs: true,
    leftPaneFlex: compact ? 1.65 : 1.55,
    rightPaneFlex: compact ? 0.9 : 0.95,
  };
}

const SHEET_BORDER = colors.primary;
const HOROSCOPE_RED = colors.primary;
const HOROSCOPE_GRID_LINE = '#570000';
const HOROSCOPE_LINE_WIDTH = 1.5;
/** Pure blue for all filled answers on the biodata summary page. */
const REVIEW_ANSWER_COLOR = '#0000FF';

const WEB_ANSWER_PROPS =
  Platform.OS === 'web' ? ({ dataSet: { biodataAnswer: 'true' } } as const) : {};

const FIELD_BG = '#FFFBF9';
const FIELD_BORDER = 'rgba(87, 0, 0, 0.12)';
const SIDEBAR_CARD_BG = 'rgba(255, 255, 255, 0.95)';
const SIDEBAR_PANEL_BG = '#ffffff';
const PLACEHOLDER = 'rgba(90, 65, 61, 0.42)';

const fieldShadow = Platform.select({
  web: { boxShadow: '0 2px 8px rgba(87, 0, 0, 0.06)' },
  default: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
});

const HOROSCOPE_SIZE = 4;
const DETAIL_GRID_COUNT = 36;
const DETAIL_GRID_ROW_SIZES = [12, 12, 12] as const;
const BIODATA_PRINT_STYLE_ID = 'biodata-print-style';

const BIODATA_SUMMARY_SCREEN_CSS = `
  #biodata-print-root [data-biodata-answer="true"],
  #biodata-print-registration [data-biodata-answer="true"] {
    color: #0000FF !important;
    -webkit-text-fill-color: #0000FF !important;
    font-weight: 600 !important;
  }
`;

const BIODATA_PRINT_CSS = `
  ${BIODATA_SUMMARY_SCREEN_CSS}
  @media print {
    @page {
      size: A4 portrait;
      margin: 4mm;
    }

    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: auto !important;
      overflow: visible !important;
      background: #ffffff !important;
    }

    body.biodata-print-active {
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    body.biodata-print-active > :not(#biodata-print-root) {
      display: none !important;
    }

    #biodata-print-root {
      display: block !important;
      position: relative !important;
      left: 0 !important;
      right: 0 !important;
      top: auto !important;
      width: 202mm !important;
      min-width: 202mm !important;
      max-width: 202mm !important;
      min-height: 0 !important;
      height: auto !important;
      margin: 0 auto !important;
      padding: 0 !important;
      overflow: visible !important;
      box-shadow: none !important;
      background: #ffffff !important;
      box-sizing: border-box !important;
      transform: none !important;
      zoom: 1 !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    #biodata-print-root,
    #biodata-print-root * {
      overflow: visible !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    #biodata-print-logo img {
      display: block !important;
      opacity: 1 !important;
      visibility: visible !important;
    }

    #biodata-action-bar {
      display: none !important;
    }

    body.biodata-print-hindu #biodata-print-root {
      display: flex !important;
      flex-direction: column !important;
      min-height: 289mm !important;
      height: 289mm !important;
      max-height: 289mm !important;
      width: 202mm !important;
      min-width: 202mm !important;
      max-width: 202mm !important;
      border: 2px solid #570000 !important;
      border-radius: 0 !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
    }

    body.biodata-print-hindu #biodata-print-letterhead {
      flex: 0 0 auto !important;
      min-height: 18mm !important;
      padding: 2.5mm 3mm !important;
      display: flex !important;
      flex-direction: row !important;
      align-items: stretch !important;
      border-bottom: 1px solid #570000 !important;
    }

    body.biodata-print-hindu #biodata-print-letterhead > div:first-child {
      flex: 1 1 auto !important;
      min-width: 0 !important;
      align-items: center !important;
      justify-content: center !important;
    }

    body.biodata-print-hindu #biodata-print-letterhead > div:nth-child(2) {
      flex: 0 0 auto !important;
      width: 20mm !important;
      min-width: 20mm !important;
    }

    body.biodata-print-hindu #biodata-print-letterhead * {
      font-size: 11px !important;
      line-height: 14px !important;
    }

    body.biodata-print-hindu #biodata-print-letterhead > div:first-child > div:nth-child(2) {
      font-size: 18px !important;
      line-height: 22px !important;
    }

    body.biodata-print-hindu #biodata-print-registration > div:first-child {
      font-size: 9px !important;
    }

    body.biodata-print-hindu #biodata-print-registration > div:last-child {
      font-size: 15px !important;
      line-height: 18px !important;
    }

    body.biodata-print-hindu #biodata-print-logo img {
      width: 48px !important;
      height: 48px !important;
    }

    body.biodata-print-hindu #biodata-print-body-row {
      flex: 1 1 auto !important;
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      align-items: stretch !important;
      width: 100% !important;
      min-width: 0 !important;
      max-height: none !important;
      overflow: hidden !important;
      border-bottom: 1px solid #570000 !important;
    }

    body.biodata-print-hindu #biodata-print-left-pane {
      flex: 1.38 1 0 !important;
      width: auto !important;
      min-width: 0 !important;
      max-width: none !important;
      border-right: 1px solid #570000 !important;
      display: flex !important;
      flex-direction: column !important;
    }

    body.biodata-print-hindu #biodata-print-right-pane {
      flex: 1 1 0 !important;
      width: auto !important;
      min-width: 0 !important;
      max-width: none !important;
      padding: 0 !important;
      gap: 0 !important;
      display: flex !important;
      flex-direction: column !important;
    }

    body.biodata-print-hindu #biodata-print-body-row * {
      font-size: 18px !important;
      line-height: 24px !important;
      word-break: normal !important;
    }

    body.biodata-print-hindu #biodata-print-left-pane * {
      font-size: 18px !important;
      line-height: 24px !important;
    }

    body.biodata-print-hindu #biodata-print-right-pane * {
      font-size: 18px !important;
      line-height: 24px !important;
      font-weight: 600 !important;
    }

    body.biodata-print-hindu #biodata-print-summary-meta {
      display: flex !important;
      flex-direction: row !important;
      justify-content: flex-end !important;
      width: 100% !important;
      margin-top: 1.5mm !important;
      padding-right: 1.5mm !important;
      border-top: 1px solid #570000 !important;
      border-bottom: none !important;
    }

    body.biodata-print-hindu #biodata-print-summary-meta > div {
      flex: 0 0 auto !important;
      width: auto !important;
      min-width: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-start !important;
      align-self: flex-end !important;
      border-top: none !important;
      border-bottom: none !important;
      border-left: none !important;
      gap: 1mm !important;
    }

    body.biodata-print-hindu #biodata-print-summary-meta > div:last-child {
      border-left: none !important;
    }

    body.biodata-print-hindu #biodata-print-summary-meta * {
      font-size: 18px !important;
      line-height: 24px !important;
    }

    body.biodata-print-hindu #biodata-print-left-pane > div {
      flex: 1 1 auto !important;
      padding-top: 1.4mm !important;
      padding-bottom: 1.4mm !important;
      padding-left: 2mm !important;
      padding-right: 2.5mm !important;
      min-height: 8mm !important;
      border-bottom: 1px solid rgba(87, 0, 0, 0.12) !important;
      align-items: center !important;
    }

    body.biodata-print-hindu #biodata-print-right-pane > div:not(#biodata-print-sibling-married):not(#biodata-print-sibling-unmarried),
    body.biodata-print-hindu #biodata-print-sibling-married > div,
    body.biodata-print-hindu #biodata-print-sibling-unmarried > div {
      flex: 1 1 auto !important;
      padding-top: 1.4mm !important;
      padding-bottom: 1.4mm !important;
      padding-left: 2mm !important;
      padding-right: 2mm !important;
      min-height: 8mm !important;
      border-bottom: 1px solid rgba(87, 0, 0, 0.12) !important;
      align-items: center !important;
    }

    body.biodata-print-hindu #biodata-print-horoscope-section {
      flex: 0 0 auto !important;
      min-height: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: flex-end !important;
      align-items: stretch !important;
      padding: 6mm 4mm 2mm !important;
      gap: 2mm !important;
      overflow: hidden !important;
    }

    body.biodata-print-hindu #biodata-print-charts {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: center !important;
      flex: 0 0 auto !important;
      width: 100% !important;
      gap: 10mm !important;
      margin-top: 4mm !important;
      padding: 0 !important;
    }

    body.biodata-print-hindu #biodata-print-charts > div {
      flex: 0 0 auto !important;
      width: 70mm !important;
      min-width: 70mm !important;
      max-width: 70mm !important;
    }

    body.biodata-print-hindu #biodata-print-chart-rasi,
    body.biodata-print-hindu #biodata-print-chart-amsam {
      width: 70mm !important;
      min-width: 70mm !important;
      max-width: 70mm !important;
    }

    body.biodata-print-hindu #biodata-print-chart-rasi > div,
    body.biodata-print-hindu #biodata-print-chart-amsam > div {
      width: 70mm !important;
      min-width: 70mm !important;
      max-width: 70mm !important;
      box-sizing: border-box !important;
      border: 2.5px solid #570000 !important;
      padding: 0 !important;
      overflow: visible !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body.biodata-print-hindu #biodata-print-chart-rasi > div > div,
    body.biodata-print-hindu #biodata-print-chart-amsam > div > div {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
      border: none !important;
      padding: 0 !important;
      box-sizing: border-box !important;
      overflow: visible !important;
    }

    body.biodata-print-hindu #biodata-print-chart-rasi > div > div > div,
    body.biodata-print-hindu #biodata-print-chart-amsam > div > div > div {
      width: 100% !important;
      height: auto !important;
      aspect-ratio: 1 / 1 !important;
      max-width: 100% !important;
      max-height: none !important;
      min-height: 0 !important;
      box-sizing: border-box !important;
      background-color: #ffffff !important;
      gap: 0 !important;
      border-right: 1.5px solid #570000 !important;
      border-bottom: 1.5px solid #570000 !important;
      overflow: visible !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body.biodata-print-hindu #biodata-print-chart-rasi > div > div > div > div,
    body.biodata-print-hindu #biodata-print-chart-amsam > div > div > div > div {
      border: none !important;
      gap: 0 !important;
      background-color: transparent !important;
    }

    body.biodata-print-hindu #biodata-print-chart-rasi > div > div > div > div > div,
    body.biodata-print-hindu #biodata-print-chart-amsam > div > div > div > div > div,
    body.biodata-print-hindu #biodata-print-chart-rasi > div > div > div > div:nth-child(2) > div:nth-child(2),
    body.biodata-print-hindu #biodata-print-chart-amsam > div > div > div > div:nth-child(2) > div:nth-child(2) {
      border-top: 1.5px solid #570000 !important;
      border-left: 1.5px solid #570000 !important;
      border-right: none !important;
      border-bottom: none !important;
      background-color: #ffffff !important;
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body.biodata-print-hindu #biodata-print-chart-rasi *,
    body.biodata-print-hindu #biodata-print-chart-amsam * {
      font-size: 13px !important;
      line-height: 15px !important;
      color: #570000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body.biodata-print-hindu #biodata-print-horoscope-footer {
      flex: 0 0 auto !important;
      width: 100% !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: flex-end !important;
      padding: 0 0 2mm !important;
      gap: 1.5mm !important;
      margin-top: 0 !important;
      overflow: hidden !important;
    }

    body.biodata-print-hindu #biodata-print-horoscope-footer * {
      font-size: 16px !important;
      line-height: 20px !important;
    }

    body.biodata-print-hindu #biodata-print-footer-box {
      display: none !important;
    }

    body.biodata-print-hindu #biodata-print-detail-grid {
      flex: 0 0 auto !important;
      width: 100% !important;
      display: block !important;
    }

    body.biodata-print-hindu #biodata-print-detail-grid > div,
    body.biodata-print-hindu #biodata-print-detail-grid > div > div {
      width: 100% !important;
      height: auto !important;
      flex: none !important;
      border: none !important;
    }

    body.biodata-print-hindu #biodata-print-detail-grid > div > div > div {
      width: 100% !important;
      height: auto !important;
      flex: none !important;
      border: 2px solid #570000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body.biodata-print-hindu #biodata-print-detail-grid > div > div > div > div {
      min-height: 7mm !important;
      height: 7mm !important;
      max-height: 7mm !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border: 1.5px solid #570000 !important;
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body.biodata-print-hindu #biodata-print-detail-grid > div > div > div > div * {
      font-size: 13px !important;
      line-height: 16px !important;
      text-align: center !important;
      width: 100% !important;
      color: #570000 !important;
    }

    body.biodata-print-christian #biodata-print-root {
      display: flex !important;
      flex-direction: column !important;
      min-height: 289mm !important;
      height: 289mm !important;
      max-height: 289mm !important;
      width: 202mm !important;
      min-width: 202mm !important;
      max-width: 202mm !important;
      border: 2px solid #570000 !important;
      border-radius: 0 !important;
      background: #ffffff !important;
      box-sizing: border-box !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-after: avoid !important;
      break-after: avoid !important;
      overflow: hidden !important;
    }

    body.biodata-print-christian #biodata-print-letterhead {
      flex: 0 0 auto !important;
      min-height: 0 !important;
      max-height: 14mm !important;
      padding: 2mm 4mm !important;
    }

    body.biodata-print-christian #biodata-print-letterhead * {
      font-size: 9px !important;
      line-height: 12px !important;
    }

    body.biodata-print-christian #biodata-print-letterhead > div:first-child > div:nth-child(2) {
      font-size: 15px !important;
      line-height: 18px !important;
    }

    body.biodata-print-christian #biodata-print-registration > div:first-child {
      font-size: 8px !important;
    }

    body.biodata-print-christian #biodata-print-registration > div:last-child {
      font-size: 13px !important;
      line-height: 16px !important;
    }

    body.biodata-print-christian #biodata-print-letterhead img {
      width: 38px !important;
      height: 38px !important;
    }

    body.biodata-print-christian #biodata-print-christian-body {
      flex: 1 1 0 !important;
      min-height: 0 !important;
      max-height: calc(289mm - 14mm) !important;
      height: auto !important;
      overflow: hidden !important;
      display: flex !important;
      flex-direction: column !important;
      width: 100% !important;
    }

    body.biodata-print-christian #biodata-print-christian-body-row {
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      align-items: stretch !important;
      flex: 1 1 0 !important;
      min-height: 0 !important;
      min-width: 0 !important;
      width: 100% !important;
      max-height: 100% !important;
      height: auto !important;
      overflow: hidden !important;
      border-bottom: none !important;
    }

    body.biodata-print-christian #biodata-print-christian-left-pane,
    body.biodata-print-christian #biodata-print-christian-right-pane {
      display: flex !important;
      flex-direction: column !important;
      flex: 1 1 0 !important;
      min-height: 100% !important;
      height: 100% !important;
      overflow: visible !important;
      justify-content: stretch !important;
    }

    body.biodata-print-christian #biodata-print-christian-left-pane {
      flex: 1.45 1 0 !important;
      border-right: 1px solid #570000 !important;
    }

    body.biodata-print-christian #biodata-print-christian-right-pane {
      flex: 1 1 0 !important;
      gap: 1mm !important;
      padding: 1.5mm !important;
      box-sizing: border-box !important;
    }

    body.biodata-print-christian #biodata-print-christian-left-pane > div {
      flex: 1 1 0 !important;
      min-height: 0 !important;
      height: auto !important;
      align-items: flex-start !important;
      padding-top: 1px !important;
      padding-bottom: 1px !important;
      padding-left: 5px !important;
      padding-right: 6px !important;
    }

    body.biodata-print-christian #biodata-print-christian-right-pane > div:nth-child(1),
    body.biodata-print-christian #biodata-print-christian-right-pane > div:nth-child(2) {
      flex: 1 1 0 !important;
      min-height: 0 !important;
      height: auto !important;
      padding: 1.5mm !important;
      box-sizing: border-box !important;
    }

    body.biodata-print-christian #biodata-print-christian-right-pane > div:nth-child(3),
    body.biodata-print-christian #biodata-print-christian-right-pane > div:nth-child(4) {
      flex: 2 1 0 !important;
      min-height: 0 !important;
      height: auto !important;
      display: flex !important;
      flex-direction: column !important;
    }

    body.biodata-print-christian #biodata-print-christian-right-pane > div:nth-child(3) > div,
    body.biodata-print-christian #biodata-print-christian-right-pane > div:nth-child(4) > div {
      flex: 1 1 0 !important;
      min-height: 0 !important;
      height: 100% !important;
      display: flex !important;
      flex-direction: column !important;
      padding: 1.5mm !important;
      box-sizing: border-box !important;
    }

    body.biodata-print-christian #biodata-print-christian-right-pane > div:nth-child(3) > div > div,
    body.biodata-print-christian #biodata-print-christian-right-pane > div:nth-child(4) > div > div {
      flex: 1 1 0 !important;
      min-height: 0 !important;
      align-items: flex-start !important;
    }

    body.biodata-print-christian #biodata-print-christian-body-row * {
      font-size: 13.5px !important;
      line-height: 16px !important;
      white-space: normal !important;
      word-break: break-word !important;
      overflow: visible !important;
    }

    body.biodata-print-christian #biodata-print-christian-right-pane > div:nth-child(3) > div > div:first-child,
    body.biodata-print-christian #biodata-print-christian-right-pane > div:nth-child(4) > div > div:first-child {
      flex: 0 0 auto !important;
      font-size: 12px !important;
      line-height: 14px !important;
      margin-bottom: 0.5mm !important;
    }

    body.biodata-print-christian #biodata-print-christian-footer {
      flex: 0 0 auto !important;
      margin-top: auto !important;
      padding-top: 2mm !important;
      padding-bottom: 2mm !important;
      min-height: 0 !important;
      max-height: 10mm !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      break-before: avoid !important;
      page-break-before: avoid !important;
      border-top: 1px solid #570000 !important;
    }

    body.biodata-print-christian #biodata-print-christian-footer * {
      font-size: 15px !important;
      line-height: 18px !important;
      font-weight: 600 !important;
      overflow: visible !important;
    }
  }
`;

function ensureBiodataPrintStyles(): void {
  if (typeof document === 'undefined') {
    return;
  }

  let style = document.getElementById(BIODATA_PRINT_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = BIODATA_PRINT_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = BIODATA_PRINT_CSS;
}

function printBiodataSheetWeb(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const printRoot = document.getElementById('biodata-print-root');
  if (!printRoot) {
    return;
  }

  ensureBiodataPrintStyles();
  window.scrollTo(0, 0);

  const placeholder = document.createComment('biodata-print-anchor');
  const originalParent = printRoot.parentNode;
  if (!originalParent) {
    window.print();
    return;
  }

  const savedPrintStyles = {
    width: printRoot.style.width,
    minWidth: printRoot.style.minWidth,
    maxWidth: printRoot.style.maxWidth,
    margin: printRoot.style.margin,
    transform: printRoot.style.transform,
  };
  printRoot.style.width = '202mm';
  printRoot.style.minWidth = '202mm';
  printRoot.style.maxWidth = '202mm';
  printRoot.style.margin = '0 auto';
  printRoot.style.transform = 'none';

  originalParent.insertBefore(placeholder, printRoot);
  document.body.appendChild(printRoot);
  document.body.classList.add('biodata-print-active');
  if (printRoot.querySelector('#biodata-print-christian-body')) {
    document.body.classList.add('biodata-print-christian');
  } else {
    document.body.classList.add('biodata-print-hindu');
  }

  const restore = () => {
    document.body.classList.remove('biodata-print-active');
    document.body.classList.remove('biodata-print-christian');
    document.body.classList.remove('biodata-print-hindu');
    printRoot.style.width = savedPrintStyles.width;
    printRoot.style.minWidth = savedPrintStyles.minWidth;
    printRoot.style.maxWidth = savedPrintStyles.maxWidth;
    printRoot.style.margin = savedPrintStyles.margin;
    printRoot.style.transform = savedPrintStyles.transform;
    if (printRoot.parentNode === document.body && originalParent) {
      originalParent.insertBefore(printRoot, placeholder);
      originalParent.removeChild(placeholder);
    }
  };

  const cleanup = () => {
    window.removeEventListener('afterprint', cleanup);
    window.clearTimeout(fallbackTimer);
    restore();
  };

  const fallbackTimer = window.setTimeout(cleanup, 6000);
  window.addEventListener('afterprint', cleanup, { once: true });

  requestAnimationFrame(() => {
    window.print();
  });
}

function createDefaultDetailGrid(): string[] {
  return Array.from({ length: DETAIL_GRID_COUNT }, (_, index) => String(index + 1));
}

function normalizeDetailGridInput(text: string): string {
  const digits = text.replace(/\D/g, '');
  if (!digits) {
    return '';
  }
  const num = Number(digits);
  if (num > 33) {
    return '33';
  }
  return String(num);
}

const HOROSCOPE_PLANETS = [
  { value: 'surya', label: 'சூ' },
  { value: 'chandra', label: 'சந்' },
  { value: 'mars', label: 'செ' },
  { value: 'mercury', label: 'பு' },
  { value: 'jupiter', label: 'வி' },
  { value: 'venus', label: 'சு' },
  { value: 'saturn', label: 'சனி' },
  { value: 'rahu', label: 'ரா' },
  { value: 'kethu', label: 'கே' },
  { value: 'lagna', label: 'ல' },
] as const;

function resolveHoroscopeCellValues(stored: string): string[] {
  const trimmed = stored.trim();
  if (!trimmed) {
    return [];
  }

  const parts = trimmed.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.map(part => {
    const byValue = HOROSCOPE_PLANETS.find((planet) => planet.value === part);
    if (byValue) {
      return byValue.value;
    }

    const byLabel = HOROSCOPE_PLANETS.find((planet) => planet.label === part);
    return byLabel?.value ?? part;
  });
}

function getHoroscopeCellLabel(stored: string): string {
  const resolvedArr = resolveHoroscopeCellValues(stored);
  if (resolvedArr.length === 0) return '';
  const labels = resolvedArr.map(val => {
    const planet = HOROSCOPE_PLANETS.find((item) => item.value === val);
    return planet?.label ?? val;
  });
  return labels.join('/');
}

type BiodataState = {
  fullName: string;
  gender: string;
  education: string;
  dateOfBirth: string;
  birthTiming: string;
  birthTimingMeridiem: string;
  religion: string;
  natchathiram: string;
  rasi: string;
  lagnam: string;
  occupation: string;
  occupationType: string;
  occupationDesignation: string;
  monthlyIncome: string;
  propertyDetails: string;
  propertyHouseType: string;
  propertyHouseCount: string;
  fatherName: string;
  motherName: string;
  fatherPhone: string;
  motherPhone: string;
  irupidam: string;
  nativePlace: string;
  totalFamilyMembers: string;
  birthOrder: string;
  marriedBrother: string;
  marriedYoungerBrother: string;
  marriedSister: string;
  marriedYoungerSister: string;
  unmarriedBrother: string;
  unmarriedYoungerBrother: string;
  unmarriedSister: string;
  unmarriedYoungerSister: string;
  complexion: string;
  height: string;
  heightUnit: string;
  seervarisai: string;
  dasaBalance: string;
  dasaYear: string;
  dasaMonth: string;
  dasaDay: string;
  registrationNumber: string;
  numSiblings: string;
  maritalStatus: string;
  livingStatus: string;
  eatingHabits: string;
  birthOrderRelation: string;
  biodataSource: string;
  biodataFilledDate: string;
};

function formatBiodataFilledDate(date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day} / ${month} / ${year}`;
}

function buildBiodataDraftValues({
  form,
  photos,
  rasiChart,
  amsamChart,
  detailGrid,
  showPhotoInBiodata,
  existingValues,
  language,
  registrationNumber,
  adminContactPhone = '',
  autoApprovePhotos = false,
}: {
  form: BiodataState;
  photos: string[];
  rasiChart: string[][];
  amsamChart: string[][];
  detailGrid: string[];
  showPhotoInBiodata: boolean;
  existingValues: Record<string, string>;
  language: Language;
  registrationNumber: string;
  adminContactPhone?: string;
  autoApprovePhotos?: boolean;
}): Record<string, string> {
  const occupationWorkKey = resolveStoredOptionValue('occupation', form.occupation, language);
  const persistSlots = photosForPersistence(photos);
  const persistablePhotoUrls = serializePersistablePhotoUrls(photos);
  const serializedPhotos = serializeProfilePhotos(photos);
  const persistedPhotos = serializeProfilePhotos(persistSlots);
  const phoneDigits = normalizePhoneDigits(adminContactPhone);
  const hasPersistablePhotos = persistablePhotoUrls.replace(/\|/g, '').trim().length > 0;

  const next = applyDefaultRegistrationCommunity({
    ...existingValues,
    fullName: form.fullName.trim(),
    gender: resolveStoredOptionValue(
      'gender',
      form.gender.trim() || existingValues.gender?.trim() || '',
      language,
    ),
    education: form.education.trim(),
    dateOfBirth: form.dateOfBirth.trim(),
    birthTiming: form.birthTiming.trim(),
    birthTimingMeridiem: form.birthTimingMeridiem.trim() || 'am',
    religion:
      normalizeRegistrationReligion(form.religion.trim() || existingValues.religion?.trim() || '') ||
      existingValues.religion?.trim() ||
      '',
    natchathiram: form.natchathiram.trim(),
    rasi: form.rasi.trim(),
    lagnam: form.lagnam.trim(),
    occupationType: form.occupationType.trim(),
    occupation: occupationWorkKey,
    occupationDesignation: form.occupationDesignation.trim(),
    workType: form.occupationType.trim() || existingValues.workType || '',
    monthlyIncome: form.monthlyIncome.trim(),
    propertyDetails: form.propertyDetails.trim(),
    propertyHouseType: form.propertyHouseType.trim(),
    propertyHouseCount: form.propertyHouseCount.trim(),
    fatherName: form.fatherName.trim(),
    motherName: form.motherName.trim(),
    fatherPhone: normalizePhoneDigits(form.fatherPhone),
    motherPhone: normalizePhoneDigits(form.motherPhone),
    irupidam: form.irupidam.trim(),
    nativePlace: form.nativePlace.trim(),
    totalFamilyMembers: form.totalFamilyMembers.trim(),
    birthOrder: form.birthOrder.trim(),
    marriedBrother: form.marriedBrother.trim(),
    marriedYoungerBrother: form.marriedYoungerBrother.trim(),
    marriedSister: form.marriedSister.trim(),
    marriedYoungerSister: form.marriedYoungerSister.trim(),
    unmarriedBrother: form.unmarriedBrother.trim(),
    unmarriedYoungerBrother: form.unmarriedYoungerBrother.trim(),
    unmarriedSister: form.unmarriedSister.trim(),
    unmarriedYoungerSister: form.unmarriedYoungerSister.trim(),
    complexion: form.complexion.trim(),
    height: form.height.trim(),
    heightUnit: form.heightUnit.trim() || 'ft',
    seervarisai: form.seervarisai.trim(),
    dasaBalance: form.dasaBalance.trim(),
    dasaYear: form.dasaYear.trim(),
    dasaMonth: form.dasaMonth.trim(),
    dasaDay: form.dasaDay.trim(),
    registrationNumber,
    numSiblings: form.numSiblings.trim(),
    maritalStatus: form.maritalStatus.trim(),
    livingStatus: form.livingStatus.trim(),
    eatingHabits: form.eatingHabits.trim(),
    birthOrderRelation: form.birthOrder.trim(),
    biodataSource: form.biodataSource.trim(),
    biodataFilledDate: form.biodataFilledDate.trim() || formatBiodataFilledDate(),
    biodataHoroscopeRasi: JSON.stringify(rasiChart),
    biodataHoroscopeAmsam: JSON.stringify(amsamChart),
    biodataDetailGrid: JSON.stringify(detailGrid),
    [PROFILE_PHOTOS_KEY]: hasPersistablePhotos ? persistedPhotos : serializedPhotos,
    [PROFILE_PHOTOS_DRAFT_KEY]: serializedPhotos,
    ...(hasPersistablePhotos
      ? {
          profilePhotoUrls: persistablePhotoUrls,
          ...(autoApprovePhotos
            ? {
                [APPROVED_PROFILE_PHOTO_URLS_KEY]: persistablePhotoUrls,
                listingImage: resolvePortableListingPhotoUri(photos),
              }
            : {}),
        }
      : {}),
    [BIODATA_SHOW_PHOTO_KEY]: showPhotoInBiodata ? 'true' : 'false',
    ...(phoneDigits
      ? {
          [CONTACT_PHONE_KEY]: phoneDigits,
          phoneNumber: phoneDigits,
        }
      : {}),
  });

  return {
    ...next,
    registrationCommunity:
      next.registrationCommunity?.trim() ||
      normalizeRegistrationReligion(next.religion ?? form.religion) ||
      existingValues.registrationCommunity?.trim() ||
      '',
  };
}

export function RegistrationNumberBar({
  editable,
  inline = false,
}: {
  editable: boolean;
  inline?: boolean;
}) {
  const { translate } = useLanguage();
  const { getValue, setValue, isReady, values } = useProfileForm();
  const [registrationNumber, setRegistrationNumber] = useState(
    () => values.registrationNumber?.trim() ?? '',
  );

  useEffect(() => {
    const stored = (values.registrationNumber ?? getValue('registrationNumber')).trim();
    if (stored) {
      setRegistrationNumber(stored);
    }
  }, [getValue, values.registrationNumber]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const religion = normalizeRegistrationReligion(values.religion ?? getValue('religion'));
      const rasi = (values.rasi ?? getValue('rasi')).trim();
      const natchathiram = (values.natchathiram ?? getValue('natchathiram')).trim();
      const storedRegistration = (values.registrationNumber ?? getValue('registrationNumber')).trim();

      if (!religion) {
        if (!cancelled) {
          setRegistrationNumber('');
        }
        return;
      }

      if (
        storedRegistration &&
        shouldKeepRegistrationNumber(storedRegistration, religion, rasi, natchathiram)
      ) {
        if (!cancelled) {
          setRegistrationNumber(storedRegistration);
        }
        return;
      }

      try {
        const nextRegistration = await previewRegistrationNumber(religion, rasi, natchathiram);

        if (cancelled || !nextRegistration) {
          return;
        }

        setRegistrationNumber(nextRegistration);
        if (nextRegistration !== storedRegistration) {
          setValue('registrationNumber', nextRegistration);
        }
      } catch {
        // Keep the last shown value if allocation fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    getValue,
    isReady,
    setValue,
    values.natchathiram,
    values.rasi,
    values.registrationNumber,
    values.religion,
  ]);

  const handleChange = useCallback(
    (text: string) => {
      const digits = sanitizeRegistrationInput(text);
      setRegistrationNumber(digits);
      setValue('registrationNumber', digits);
    },
    [setValue],
  );

  const registrationInputProps = {
    value: registrationNumber,
    onChangeText: handleChange,
    editable,
    placeholderTextColor: PLACEHOLDER,
    keyboardType: 'number-pad' as const,
    maxLength: 7,
  };

  return (
    <View style={[registrationHeaderStyles.wrap, inline && registrationHeaderStyles.wrapInline]}>
      <View style={[registrationHeaderStyles.card, inline && registrationHeaderStyles.cardInline]}>
        <Text
          style={[registrationHeaderStyles.label, inline && registrationHeaderStyles.labelInline]}
          numberOfLines={1}
        >
          {translate(inline ? 'biodataRegistrationNumberShort' : 'biodataRegistrationNumber')}
        </Text>
        {inline ? (
          <TextInput
            style={registrationHeaderStyles.inputInline}
            {...registrationInputProps}
            numberOfLines={1}
          />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={registrationHeaderStyles.scroll}
          >
            <TextInput
              style={registrationHeaderStyles.input}
              {...registrationInputProps}
            />
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const registrationHeaderStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: 2,
    paddingBottom: 2,
  },
  wrapInline: {
    flexShrink: 0,
    alignItems: 'stretch',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF0ED',
    borderRadius: borderRadius.md,
    paddingVertical: 5,
    paddingHorizontal: 10,
    width: '100%',
    maxWidth: 360,
  },
  cardInline: {
    flexShrink: 0,
    gap: 3,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.1)',
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(87, 0, 0, 0.06)' },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 1,
      },
    }),
  },
  label: {
    color: colors.primary,
    fontSize: 11,
    fontFamily: fonts.interSemi,
    flexShrink: 0,
  },
  labelInline: {
    fontSize: 10,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  input: {
    width: 52,
    minHeight: 28,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    color: colors.onSurface,
    fontSize: 12,
    fontFamily: fonts.interSemi,
    textAlign: 'center',
  },
  inputInline: {
    width: 52,
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 26,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.12)',
    color: colors.onSurface,
    fontSize: 11,
    fontFamily: fonts.interSemi,
    textAlign: 'center',
  },
});

function emptyHoroscope(): string[][] {
  return Array.from({ length: HOROSCOPE_SIZE }, () =>
    Array.from({ length: HOROSCOPE_SIZE }, () => ''),
  );
}

function parseHoroscope(raw: string | undefined): string[][] {
  if (!raw) {
    return emptyHoroscope();
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return emptyHoroscope();
    }
    return Array.from({ length: HOROSCOPE_SIZE }, (_, row) =>
      Array.from({ length: HOROSCOPE_SIZE }, (_, col) => {
        const rowValue = parsed[row];
        if (!Array.isArray(rowValue)) {
          return '';
        }
        return typeof rowValue[col] === 'string' ? rowValue[col] : '';
      }),
    );
  } catch {
    return emptyHoroscope();
  }
}

function parseDetailGrid(raw: string | undefined): string[] {
  if (!raw) {
    return createDefaultDetailGrid();
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return createDefaultDetailGrid();
    }
    return Array.from({ length: DETAIL_GRID_COUNT }, (_, index) =>
      typeof parsed[index] === 'string' ? parsed[index] : String(index + 1),
    );
  } catch {
    return createDefaultDetailGrid();
  }
}

const cardShadow = Platform.select({
  web: {
    boxShadow: '0 8px 32px rgba(87, 0, 0, 0.1)',
  },
  default: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
});

const actionBarShadow = Platform.select({
  web: {
    boxShadow: '0 -4px 20px rgba(87, 0, 0, 0.08)',
  },
  default: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
});

function normalizeRegistrationReligion(stored: string): string {
  return normalizeRegistrationReligionValue(stored);
}

const PROFILE_INCOMPLETE_FIELD_LABELS = {
  fullName: 'biodataFieldName',
  gender: 'biodataFieldGender',
  dateOfBirth: 'biodataFieldDateOfBirth',
  community: 'religion',
} as const satisfies Record<
  import('@/constants/profileCompletion').ProfileIncompleteField,
  keyof typeof import('@/constants/i18n').translations.en
>;

function formatProfileIncompleteMessage(
  missing: ReturnType<typeof getProfileIncompleteFields>,
  translate: (key: keyof typeof import('@/constants/i18n').translations.en) => string,
  translateFormat: (
    key: keyof typeof import('@/constants/i18n').translations.en,
    vars: Record<string, string | number>,
  ) => string,
): string {
  if (missing.length === 0) {
    return translate('profileIncompleteSave');
  }

  const fields = missing.map((field) => translate(PROFILE_INCOMPLETE_FIELD_LABELS[field])).join(', ');
  return translateFormat('profileIncompleteSaveFields', { fields });
}

function resolveStoredOptionValue(
  optionsKey: FormOptionsKey,
  stored: string,
  language: Language,
): string {
  const trimmed = stored.trim();
  if (!trimmed) {
    return '';
  }

  const options = getFormOptions(optionsKey, language);
  if (options.some((option) => option.value === trimmed)) {
    return trimmed;
  }

  if (optionsKey === 'dasaYear' || optionsKey === 'dasaMonth' || optionsKey === 'dasaDay') {
    const num = Number.parseInt(trimmed, 10);
    if (!Number.isNaN(num)) {
      const max = optionsKey === 'dasaYear' ? 20 : optionsKey === 'dasaMonth' ? 12 : 31;
      if (num >= 1 && num <= max) {
        const padded = String(num).padStart(2, '0');
        if (options.some((option) => option.value === padded)) {
          return padded;
        }
      }
    }
  }

  const exactLabel = options.find(
    (option) => option.label.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exactLabel) {
    return exactLabel.value;
  }

  const looseLabel = options.find(
    (option) =>
      option.label.toLowerCase().includes(trimmed.toLowerCase()) ||
      trimmed.toLowerCase().includes(option.label.toLowerCase()),
  );
  return looseLabel?.value ?? trimmed;
}

function SectionCard({ children, dense }: { children: ReactNode; dense?: boolean }) {
  return <View style={[styles.sectionCard, dense && styles.sectionCardDense]}>{children}</View>;
}

function IconFieldShell({
  children,
  dense,
}: {
  icon?: keyof typeof MaterialIcons.glyphMap;
  children: ReactNode;
  dense?: boolean;
  onIconPress?: () => void;
}) {
  return (
    <View style={[styles.iconFieldShell, dense && styles.iconFieldShellDense]}>
      <View style={styles.iconFieldBody}>{children}</View>
    </View>
  );
}

function BiodataSelectRow({
  label,
  value,
  onValueChange,
  optionsKey,
  optionsOverride,
  editable,
  dense,
  placeholder,
  icon,
  narrow,
  hideLabel,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  optionsKey: FormOptionsKey;
  optionsOverride?: Array<{ value: string; label: string }>;
  editable: boolean;
  dense?: boolean;
  placeholder?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  narrow?: boolean;
  hideLabel?: boolean;
}) {
  const { language } = useLanguage();
  const options = useMemo(
    () => optionsOverride ?? getFormOptions(optionsKey, language),
    [language, optionsKey, optionsOverride],
  );
  const resolvedValue = useMemo(() => {
    if (optionsOverride) {
      return options.some((option) => option.value === value.trim()) ? value.trim() : value.trim();
    }
    return resolveStoredOptionValue(optionsKey, value, language);
  }, [language, options, optionsKey, optionsOverride, value]);

  if (!editable) {
    const display = optionsOverride
      ? options.find((option) => option.value === resolvedValue)?.label ?? resolvedValue
      : getOptionLabel(optionsKey, resolvedValue, language, value);
    return (
      <View style={[styles.fieldGroup, dense && styles.fieldGroupDense, narrow && styles.fieldGroupNarrow]}>
        {hideLabel ? null : (
          <Text
            style={[styles.fieldLabel, dense && styles.fieldLabelDense, narrow && styles.fieldLabelNarrow]}
            numberOfLines={1}
          >
            {label}
          </Text>
        )}
        <View style={[styles.fieldInput, styles.fieldInputReadonly, dense && styles.fieldInputDense]}>
          <Text style={styles.fieldReadonlyText} numberOfLines={1}>
            {display || ''}
          </Text>
        </View>
      </View>
    );
  }

  const selectField = (
    <SelectField
      label={label}
      value={resolvedValue}
      onValueChange={onValueChange}
      options={options}
      placeholder={placeholder}
      showLabel={false}
      compact
      variant="premium"
      embedded
      tight={narrow}
    />
  );

  return (
    <View
      style={[
        styles.fieldGroup,
        dense && styles.fieldGroupDense,
        styles.selectFieldGroup,
        narrow && styles.fieldGroupNarrow,
      ]}
    >
      {hideLabel ? null : (
        <Text
          style={[styles.fieldLabel, dense && styles.fieldLabelDense, narrow && styles.fieldLabelNarrow]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {label}
        </Text>
      )}
      <View style={[styles.narrowSelectShell, dense && styles.narrowSelectShellDense]}>{selectField}</View>
    </View>
  );
}

function BiodataOccupationFields({
  occupationType,
  occupation,
  occupationDesignation,
  onTypeChange,
  onOccupationChange,
  onDesignationChange,
  editable,
  dense,
}: {
  occupationType: string;
  occupation: string;
  occupationDesignation: string;
  onTypeChange: (value: string) => void;
  onOccupationChange: (value: string) => void;
  onDesignationChange: (value: string) => void;
  editable: boolean;
  dense?: boolean;
}) {
  const { language, translate } = useLanguage();

  const handleOccupationChange = useCallback(
    (value: string) => {
      onTypeChange(value);
      if (!value) {
        onOccupationChange('');
        onDesignationChange('');
      }
    },
    [onDesignationChange, onOccupationChange, onTypeChange],
  );

  const handleRoleChange = useCallback(
    (value: string) => {
      onOccupationChange(value);
      if (!value) {
        onDesignationChange('');
      }
    },
    [onDesignationChange, onOccupationChange],
  );

  if (!editable) {
    const occupationDisplay = getOptionLabel('occupationType', occupationType, language, occupationType);
    const roleDisplay = getOptionLabel('occupation', occupation, language, occupation);
    return (
      <View style={[styles.fieldGroup, dense && styles.fieldGroupDense]}>
        <Text style={[styles.fieldLabel, dense && styles.fieldLabelDense]}>
          {translate('biodataFieldOccupation')}
        </Text>
        <View style={[styles.fieldInput, styles.fieldInputReadonly, dense && styles.fieldInputDense]}>
          <Text style={styles.fieldReadonlyText}>
            {[occupationDisplay, roleDisplay, occupationDesignation.trim()].filter(Boolean).join(' ┬À ') || ''}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.occupationFieldsWrap}>
      <View style={styles.fieldPairRow}>
        <View style={styles.fieldPairItem}>
          <BiodataSelectRow
            label={translate('biodataOccupationMain')}
            value={occupationType}
            onValueChange={handleOccupationChange}
            optionsKey="occupationType"
            editable={editable}
            dense={dense}
            placeholder={translate('selectOccupationType')}
          />
        </View>
        <View style={styles.fieldPairItem}>
          <BiodataSelectRow
            label={translate('biodataOccupationRole')}
            value={occupation}
            onValueChange={handleRoleChange}
            optionsKey="occupation"
            editable={editable}
            dense={dense}
            placeholder={translate('selectOccupationRole')}
          />
        </View>
      </View>
    </View>
  );
}

function BottomSheetModal({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.bottomSheetRoot}>
        <Pressable style={styles.bottomSheetBackdrop} onPress={onClose} />
        <View style={styles.bottomSheetCard}>
          <View style={styles.bottomSheetHandle} />
          {title ? <Text style={styles.bottomSheetTitle}>{title}</Text> : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

function DasaBalanceFields({
  dasaBalance,
  dasaYear,
  dasaMonth,
  dasaDay,
  onFieldChange,
  editable,
  dense,
}: {
  dasaBalance: string;
  dasaYear: string;
  dasaMonth: string;
  dasaDay: string;
  onFieldChange: (field: 'dasaBalance' | 'dasaYear' | 'dasaMonth' | 'dasaDay', value: string) => void;
  editable: boolean;
  dense?: boolean;
}) {
  const { language, translate } = useLanguage();

  const planetOptions = useMemo(() => getFormOptions('dasaPlanet', language), [language]);
  const yearOptions = useMemo(() => getFormOptions('dasaYear', language), [language]);
  const monthOptions = useMemo(() => getFormOptions('dasaMonth', language), [language]);
  const dayOptions = useMemo(() => getFormOptions('dasaDay', language), [language]);

  const resolvedPlanet = useMemo(
    () => resolveStoredOptionValue('dasaPlanet', dasaBalance, language),
    [dasaBalance, language],
  );
  const resolvedYear = useMemo(
    () => resolveStoredOptionValue('dasaYear', dasaYear, language),
    [dasaYear, language],
  );
  const resolvedMonth = useMemo(
    () => resolveStoredOptionValue('dasaMonth', dasaMonth, language),
    [dasaMonth, language],
  );
  const resolvedDay = useMemo(
    () => resolveStoredOptionValue('dasaDay', dasaDay, language),
    [dasaDay, language],
  );

  if (!editable) {
    const planetLabel = getOptionLabel('dasaPlanet', resolvedPlanet, language, dasaBalance) || '';
    const yearLabel = getOptionLabel('dasaYear', resolvedYear, language, dasaYear) || '';
    const monthLabel = getOptionLabel('dasaMonth', resolvedMonth, language, dasaMonth) || '';
    const dayLabel = getOptionLabel('dasaDay', resolvedDay, language, dasaDay) || '';
    const readonlySegments = [
      { label: translate('biodataDasaBalanceShort'), value: planetLabel, emphasize: true },
      { label: translate('selectDasaYear'), value: yearLabel },
      { label: translate('selectDasaMonth'), value: monthLabel },
      { label: translate('selectDasaDay'), value: dayLabel },
    ];

    return (
      <View style={[styles.dasaReadonlySpreadRow, dense && styles.dasaReadonlySpreadRowDense]}>
        {readonlySegments.map((segment) => (
          <View
            key={segment.label}
            style={[styles.dasaReadonlySegment, dense && styles.dasaReadonlySegmentDense]}
          >
            <Text
              style={[styles.dasaReadonlyLabel, dense && styles.dasaReadonlyLabelDense]}
              numberOfLines={1}
            >
              {segment.label}:
            </Text>
            <Text
              style={[
                styles.dasaReadonlyValue,
                dense && styles.dasaReadonlyValueDense,
                segment.emphasize && styles.dasaReadonlyValueEmphasis,
              ]}
              numberOfLines={1}
              {...(segment.emphasize ? {} : WEB_ANSWER_PROPS)}
            >
              {segment.value}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.dasaBalanceStack, dense && styles.dasaBalanceStackDense]}>
      <View style={[styles.dasaBalanceRow, dense && styles.dasaBalanceRowDense]}>
        <Text style={[styles.dasaBalanceTitle, dense && styles.dasaBalanceTitleDense]} numberOfLines={1}>
          {translate('biodataDasaBalanceShort')}
        </Text>
        <View style={[styles.dasaInlineSelect, styles.dasaPlanetSelectWrap, styles.selectFieldGroup]}>
          <SelectField
            label={translate('biodataDasaBalance')}
            value={resolvedPlanet}
            onValueChange={(value) => onFieldChange('dasaBalance', value)}
            options={planetOptions}
            placeholder={translate('selectDasaPlanet')}
            showLabel={false}
            compact
            variant="premium"
            embedded
            tight
          />
        </View>
      </View>
      <View style={[styles.dasaBalanceRow, dense && styles.dasaBalanceRowDense]}>
        <View style={styles.dasaDateField}>
          <Text style={[styles.dasaDatePrefix, dense && styles.dasaDatePrefixDense]} numberOfLines={1}>
            {translate('selectDasaYear')}
          </Text>
          <View style={[styles.dasaInlineSelect, styles.dasaYearSelectWrap, styles.selectFieldGroup]}>
            <TextInput
              style={[
                styles.fieldInput,
                styles.dasaTextInput,
                dense && styles.fieldInputDense,
              ]}
              value={resolvedYear}
              onChangeText={(value) => onFieldChange('dasaYear', value)}
              placeholder={translate('selectDasaYear')}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        </View>
        <View style={styles.dasaDateField}>
          <Text style={[styles.dasaDatePrefix, dense && styles.dasaDatePrefixDense]} numberOfLines={1}>
            {translate('selectDasaMonth')}
          </Text>
          <View style={[styles.dasaInlineSelect, styles.dasaMonthSelectWrap, styles.selectFieldGroup]}>
            <TextInput
              style={[
                styles.fieldInput,
                styles.dasaTextInput,
                dense && styles.fieldInputDense,
              ]}
              value={resolvedMonth}
              onChangeText={(value) => onFieldChange('dasaMonth', value)}
              placeholder={translate('selectDasaMonth')}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        </View>
        <View style={styles.dasaDateField}>
          <Text style={[styles.dasaDatePrefix, dense && styles.dasaDatePrefixDense]} numberOfLines={1}>
            {translate('selectDasaDay')}
          </Text>
          <View style={[styles.dasaInlineSelect, styles.dasaDaySelectWrap, styles.selectFieldGroup]}>
            <TextInput
              style={[
                styles.fieldInput,
                styles.dasaTextInput,
                dense && styles.fieldInputDense,
              ]}
              value={resolvedDay}
              onChangeText={(value) => onFieldChange('dasaDay', value)}
              placeholder={translate('selectDasaDay')}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

function formatBiodataDateDigits(digits: string): string {
  const normalized = digits.replace(/\D/g, '').slice(0, 8);
  if (!normalized) {
    return '';
  }
  if (normalized.length <= 2) {
    return normalized;
  }
  if (normalized.length <= 4) {
    return `${normalized.slice(0, 2)} / ${normalized.slice(2)}`;
  }
  return `${normalized.slice(0, 2)} / ${normalized.slice(2, 4)} / ${normalized.slice(4)}`;
}

function normalizeBiodataDateValue(digits: string): string {
  if (digits.length < 8) {
    return formatBiodataDateDigits(digits);
  }

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));

  if (!day || !month || !year) {
    return formatBiodataDateDigits(digits);
  }

  return `${String(day).padStart(2, '0')} / ${String(month).padStart(2, '0')} / ${year}`;
}

function formatBiodataTimeDigits(digits: string): string {
  if (digits.length <= 2) {
    return digits;
  }
  return `${digits.slice(0, 2)} : ${digits.slice(2)}`;
}

type BirthTimingMeridiem = 'am' | 'pm';

const BIRTH_TIMING_MERIDIEM_OPTIONS: { value: BirthTimingMeridiem; label: string }[] = [
  { value: 'am', label: 'AM' },
  { value: 'pm', label: 'PM' },
];

function resolveBirthTimingMeridiem(storedMeridiem: string, time: string): BirthTimingMeridiem {
  if (storedMeridiem === 'am' || storedMeridiem === 'pm') {
    return storedMeridiem;
  }

  const match = time.trim().match(/^(\d{1,2})\s*:\s*(\d{2})$/);
  if (!match) {
    return 'am';
  }

  const hour = Number(match[1]);
  if (hour >= 12) {
    return 'pm';
  }
  return 'am';
}

function migrateBirthTimingToTwelveHour(time: string, meridiem: BirthTimingMeridiem): string {
  const match = time.trim().match(/^(\d{1,2})\s*:\s*(\d{2})$/);
  if (!match) {
    return time;
  }

  let hour = Number(match[1]);
  const minute = match[2];
  if (hour >= 1 && hour <= 12) {
    return `${String(hour).padStart(2, '0')} : ${minute}`;
  }

  if (hour > 12) {
    hour -= 12;
  } else if (hour === 0) {
    hour = 12;
  }

  return `${String(hour).padStart(2, '0')} : ${minute}`;
}

function normalizeBiodataTimeValue(digits: string): string {
  if (digits.length < 4) {
    return formatBiodataTimeDigits(digits);
  }

  let hour = Number(digits.slice(0, 2));
  let minute = Number(digits.slice(2, 4));
  if (hour < 1) {
    hour = 1;
  }
  if (hour > 12) {
    hour = 12;
  }
  if (minute > 59) {
    minute = 59;
  }

  return `${String(hour).padStart(2, '0')} : ${String(minute).padStart(2, '0')}`;
}

function parseBiodataTime(value: string, meridiem: BirthTimingMeridiem = 'am'): Date | null {
  const match = value.trim().match(/^(\d{1,2})\s*:\s*(\d{2})$/);
  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 1 || hour > 12 || minute > 59) {
    return null;
  }

  if (meridiem === 'pm' && hour < 12) {
    hour += 12;
  }
  if (meridiem === 'am' && hour === 12) {
    hour = 0;
  }

  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function formatBiodataTimeFromDate(date: Date): { time: string; meridiem: BirthTimingMeridiem } {
  const hours24 = date.getHours();
  const meridiem: BirthTimingMeridiem = hours24 >= 12 ? 'pm' : 'am';
  const hour12 = hours24 % 12 || 12;

  return {
    time: `${String(hour12).padStart(2, '0')} : ${String(date.getMinutes()).padStart(2, '0')}`,
    meridiem,
  };
}

function toWebTimeInputValue(value: string, meridiem: BirthTimingMeridiem): string {
  const parsed = parseBiodataTime(value, meridiem);
  if (!parsed) {
    return '';
  }

  return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
}

function fromWebTimeInputValue(value: string): { time: string; meridiem: BirthTimingMeridiem } | null {
  const [hour, minute] = value.split(':');
  if (!hour || !minute) {
    return null;
  }

  const date = new Date();
  date.setHours(Number(hour), Number(minute), 0, 0);
  return formatBiodataTimeFromDate(date);
}

function BiodataDateRow({
  label,
  value,
  onValueChange,
  editable,
  dense,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  editable: boolean;
  dense?: boolean;
  icon?: keyof typeof MaterialIcons.glyphMap;
  placeholder?: string;
  required?: boolean;
}) {
  const handleDateChange = useCallback(
    (text: string) => {
      const digits = text.replace(/\D/g, '').slice(0, 8);
      onValueChange(normalizeBiodataDateValue(digits));
    },
    [onValueChange],
  );

  const labelNode = (
    <Text style={[styles.fieldLabel, dense && styles.fieldLabelDense]}>
      {label}
      {required ? <Text style={styles.requiredMark}> *</Text> : null}
    </Text>
  );

  if (!editable) {
    return (
      <View style={[styles.fieldGroup, dense && styles.fieldGroupDense]}>
        {labelNode}
        <View style={[styles.fieldInput, styles.fieldInputReadonly, dense && styles.fieldInputDense]}>
          <Text style={styles.fieldReadonlyText}>{value || ''}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.fieldGroup, dense && styles.fieldGroupDense]}>
      {labelNode}
      <View style={[styles.dateFieldShell, dense && styles.dateFieldShellDense]}>
        <TextInput
          style={[styles.dateFieldInput, dense && styles.dateFieldInputDense]}
          value={value}
          onChangeText={handleDateChange}
          editable={editable}
          placeholder={placeholder}
          placeholderTextColor={PLACEHOLDER}
          keyboardType="number-pad"
          maxLength={14}
        />
      </View>
    </View>
  );
}

function BiodataTimeRow({
  label,
  value,
  meridiem,
  onValueChange,
  onMeridiemChange,
  editable,
  dense,
  placeholder,
}: {
  label: string;
  value: string;
  meridiem: string;
  onValueChange: (value: string) => void;
  onMeridiemChange: (value: BirthTimingMeridiem) => void;
  editable: boolean;
  dense?: boolean;
  placeholder?: string;
}) {
  const { translate } = useLanguage();
  const webTimeInputRef = useRef<HTMLInputElement | null>(null);
  const resolvedMeridiem = resolveBirthTimingMeridiem(meridiem, value);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTime, setPickerTime] = useState(
    () => parseBiodataTime(value, resolvedMeridiem) ?? new Date(),
  );

  useEffect(() => {
    const parsed = parseBiodataTime(value, resolvedMeridiem);
    if (parsed) {
      setPickerTime(parsed);
    }
  }, [resolvedMeridiem, value]);

  const handleTimeChange = useCallback(
    (text: string) => {
      const digits = text.replace(/\D/g, '').slice(0, 4);
      onValueChange(normalizeBiodataTimeValue(digits));
    },
    [onValueChange],
  );

  const applyPickedTime = useCallback(
    (date: Date) => {
      const formatted = formatBiodataTimeFromDate(date);
      onValueChange(formatted.time);
      onMeridiemChange(formatted.meridiem);
      setPickerTime(date);
    },
    [onMeridiemChange, onValueChange],
  );

  const openTimePicker = useCallback(() => {
    if (Platform.OS === 'web') {
      const input = webTimeInputRef.current;
      if (!input) {
        return;
      }
      if (typeof input.showPicker === 'function') {
        input.showPicker();
      } else {
        input.click();
      }
      return;
    }

    setPickerTime(parseBiodataTime(value, resolvedMeridiem) ?? new Date());
    setShowPicker(true);
  }, [resolvedMeridiem, value]);

  const handleNativePickerChange = useCallback(
    (event: DateTimePickerEvent, date?: Date) => {
      if (Platform.OS === 'android') {
        setShowPicker(false);
      }

      if (event.type === 'dismissed' || !date) {
        if (Platform.OS === 'ios') {
          setShowPicker(false);
        }
        return;
      }

      applyPickedTime(date);
      if (Platform.OS === 'ios') {
        setShowPicker(false);
      }
    },
    [applyPickedTime],
  );

  const readonlyDisplay = [value.trim(), resolvedMeridiem.toUpperCase()].filter(Boolean).join(' ');

  if (!editable) {
    return (
      <View style={[styles.fieldGroup, dense && styles.fieldGroupDense]}>
        <Text style={[styles.fieldLabel, dense && styles.fieldLabelDense]}>{label}</Text>
        <View style={[styles.fieldInput, styles.fieldInputReadonly, dense && styles.fieldInputDense]}>
          <Text style={styles.fieldReadonlyText}>{readonlyDisplay}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.fieldGroup, dense && styles.fieldGroupDense, styles.selectFieldGroup]}>
      <Text style={[styles.fieldLabel, dense && styles.fieldLabelDense]}>{label}</Text>
      <View style={[styles.heightFieldShell, dense && styles.heightFieldShellDense]}>
        <TextInput
          style={[styles.heightFieldInput, dense && styles.heightFieldInputDense]}
          value={value}
          onChangeText={handleTimeChange}
          onFocus={Platform.OS !== 'web' ? openTimePicker : undefined}
          editable={editable}
          placeholder={placeholder}
          placeholderTextColor={PLACEHOLDER}
          keyboardType="number-pad"
          maxLength={8}
        />
        <View style={styles.heightFieldDivider} />
        <View style={[styles.heightUnitPicker, dense && styles.heightUnitPickerDense]}>
          <SelectField
            label=""
            value={resolvedMeridiem}
            onValueChange={(next) => onMeridiemChange(next as BirthTimingMeridiem)}
            options={BIRTH_TIMING_MERIDIEM_OPTIONS}
            showLabel={false}
            compact
            variant="premium"
            embedded
            tight
          />
        </View>
      </View>
      {Platform.OS === 'web'
        ? createElement('input', {
            ref: webTimeInputRef,
            type: 'time',
            value: toWebTimeInputValue(value, resolvedMeridiem),
            onChange: (event: { target: { value: string } }) => {
              const nextValue = fromWebTimeInputValue(event.target.value);
              if (nextValue) {
                onValueChange(nextValue.time);
                onMeridiemChange(nextValue.meridiem);
              }
            },
            style: {
              position: 'absolute',
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: 'none',
            },
          })
        : null}
      {showPicker && Platform.OS === 'ios' ? (
        <Modal transparent animationType="slide" visible onRequestClose={() => setShowPicker(false)}>
          <Pressable style={styles.datePickerOverlay} onPress={() => setShowPicker(false)}>
            <Pressable style={styles.datePickerSheet} onPress={(event) => event.stopPropagation()}>
              <DateTimePicker
                value={pickerTime}
                mode="time"
                display="spinner"
                onChange={(_, date) => {
                  if (date) {
                    setPickerTime(date);
                  }
                }}
              />
              <Pressable style={styles.datePickerDoneBtn} onPress={() => applyPickedTime(pickerTime)}>
                <Text style={styles.datePickerDoneText}>{translate('ok')}</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
      {showPicker && Platform.OS === 'android' ? (
        <DateTimePicker value={pickerTime} mode="time" display="default" onChange={handleNativePickerChange} />
      ) : null}
    </View>
  );
}

function BiodataNameDegreeRow({
  label,
  nameValue,
  degreeValue,
  onNameChange,
  onDegreeChange,
  editable,
  dense,
  namePlaceholder,
  degreePlaceholder,
}: {
  label: string;
  nameValue: string;
  degreeValue: string;
  onNameChange: (text: string) => void;
  onDegreeChange: (value: string) => void;
  editable: boolean;
  dense?: boolean;
  namePlaceholder?: string;
  degreePlaceholder?: string;
}) {
  const { language } = useLanguage();
  const tamilInputProps = useTamilTextInputProps();
  const degreeOptions = useMemo(() => getFormOptions('degreeDetail', language), [language]);
  const resolvedDegree = useMemo(
    () => resolveStoredOptionValue('degreeDetail', degreeValue, language),
    [degreeValue, language],
  );

  if (!editable) {
    const degreeDisplay = getOptionLabel('degreeDetail', resolvedDegree, language, degreeValue);
    return (
      <View style={[styles.fieldGroup, dense && styles.fieldGroupDense]}>
        <Text style={[styles.fieldLabel, dense && styles.fieldLabelDense]}>{label}</Text>
        <View style={[styles.fieldInput, styles.fieldInputReadonly, dense && styles.fieldInputDense]}>
          <Text style={styles.fieldReadonlyText}>
            {[nameValue.trim(), degreeDisplay].filter(Boolean).join(' ┬À ') || ''}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.fieldGroup, dense && styles.fieldGroupDense, styles.selectFieldGroup]}>
      <Text style={[styles.fieldLabel, dense && styles.fieldLabelDense]}>{label}</Text>
      <IconFieldShell dense={dense}>
        <View style={styles.nameDegreeRow}>
          <TextInput
            {...tamilInputProps}
            style={[
              styles.fieldInput,
              styles.fieldInputWithIcon,
              styles.nameDegreeInput,
              dense && styles.fieldInputDense,
            ]}
            value={nameValue}
            onChangeText={onNameChange}
            editable={editable}
            placeholder={namePlaceholder}
            placeholderTextColor={PLACEHOLDER}
          />
          <View style={styles.nameDegreeDivider} />
          <View style={styles.nameDegreeSelect}>
            <TextInput
              style={[
                styles.fieldInput,
                styles.nameDegreeInput,
                dense && styles.fieldInputDense,
                { borderLeftWidth: 0, paddingLeft: 8, height: '100%', flex: 1, backgroundColor: 'transparent' },
                Platform.select({ web: { outlineStyle: 'none' }, default: {} }),
              ]}
              value={degreeValue}
              onChangeText={onDegreeChange}
              editable={editable}
              placeholder={degreePlaceholder}
              placeholderTextColor={PLACEHOLDER}
            />
          </View>
        </View>
      </IconFieldShell>
    </View>
  );
}

function BiodataRow({
  label,
  value,
  onChangeText,
  editable,
  multiline,
  dense,
  placeholder,
  icon,
  narrow,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  editable: boolean;
  multiline?: boolean;
  dense?: boolean;
  placeholder?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  narrow?: boolean;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
}) {
  const tamilInputProps = useTamilTextInputProps();
  const input = (
    <TextInput
      {...tamilInputProps}
      style={[
        narrow ? styles.narrowFieldInput : [styles.fieldInput, styles.textFieldFullWidth],
        dense && styles.fieldInputDense,
        multiline && styles.fieldInputMultiline,
        multiline && dense && styles.fieldInputMultilineDense,
        !editable && styles.fieldInputReadonly,
      ]}
      value={value}
      onChangeText={onChangeText}
      editable={editable}
      multiline={multiline}
      placeholder={placeholder}
      placeholderTextColor={PLACEHOLDER}
      keyboardType={keyboardType}
    />
  );

  return (
    <View
      style={[
        styles.fieldGroup,
        dense && styles.fieldGroupDense,
        narrow && styles.fieldGroupNarrow,
      ]}
    >
      <Text
        style={[styles.fieldLabel, dense && styles.fieldLabelDense, narrow && styles.fieldLabelNarrow]}
        numberOfLines={1}
        adjustsFontSizeToFit={narrow}
        minimumFontScale={0.8}
      >
        {label}
      </Text>
      {narrow ? (
        <View style={[styles.narrowSelectShell, dense && styles.narrowSelectShellDense]}>{input}</View>
      ) : (
        input
      )}
    </View>
  );
}

type HeightUnit = 'ft' | 'cm';

function resolveHeightUnit(storedUnit: string, height: string): HeightUnit {
  if (storedUnit === 'ft' || storedUnit === 'cm') {
    return storedUnit;
  }
  if (/^\d{3}$/.test(height.trim())) {
    return 'cm';
  }
  return 'ft';
}

function sanitizeHeightInput(text: string, unit: HeightUnit): string {
  if (unit === 'cm') {
    return text.replace(/\D/g, '').slice(0, 3);
  }

  const cleaned = text.replace(/[^\d.]/g, '');
  const dotIndex = cleaned.indexOf('.');
  if (dotIndex < 0) {
    return cleaned.slice(0, 1);
  }

  const whole = cleaned.slice(0, dotIndex).replace(/\./g, '').slice(0, 1);
  let fraction = cleaned.slice(dotIndex + 1).replace(/\./g, '').slice(0, 2);
  if (cleaned.endsWith('.') && !fraction) {
    return `${whole}.`;
  }

  if (fraction) {
    const inches = Number(fraction);
    if (!Number.isNaN(inches) && inches > 11) {
      fraction = '11';
    }
    return `${whole}.${fraction}`;
  }

  return whole;
}

const HEIGHT_UNIT_OPTIONS: { value: HeightUnit; label: string }[] = [
  { value: 'ft', label: 'ft' },
  { value: 'cm', label: 'cm' },
];

function BiodataHeightRow({
  label,
  value,
  unit,
  onValueChange,
  onUnitChange,
  editable,
  dense,
}: {
  label: string;
  value: string;
  unit: HeightUnit;
  onValueChange: (text: string) => void;
  onUnitChange: (unit: HeightUnit) => void;
  editable: boolean;
  dense?: boolean;
}) {
  const { translate } = useLanguage();
  const placeholder =
    unit === 'cm' ? translate('heightPlaceholderCm') : translate('heightPlaceholderFeet');
  const readonlyDisplay = [value.trim(), unit].filter(Boolean).join(' ');

  return (
    <View
      style={[
        styles.fieldGroup,
        dense && styles.fieldGroupDense,
        editable && styles.selectFieldGroup,
      ]}
    >
      <Text style={[styles.fieldLabel, dense && styles.fieldLabelDense]} numberOfLines={1}>
        {label}
      </Text>
      <View
        style={[
          styles.heightFieldShell,
          dense && styles.heightFieldShellDense,
          !editable && styles.fieldInputReadonly,
        ]}
      >
        {editable ? (
          <>
            <TextInput
              style={[styles.heightFieldInput, dense && styles.heightFieldInputDense]}
              value={value}
              onChangeText={(text) => onValueChange(sanitizeHeightInput(text, unit))}
              editable={editable}
              placeholder={placeholder}
              placeholderTextColor={PLACEHOLDER}
              keyboardType={unit === 'cm' ? 'number-pad' : 'decimal-pad'}
            />
            <View style={styles.heightFieldDivider} />
            <View style={[styles.heightUnitPicker, dense && styles.heightUnitPickerDense]}>
              <SelectField
                label=""
                value={unit}
                onValueChange={(next) => onUnitChange(next as HeightUnit)}
                options={HEIGHT_UNIT_OPTIONS}
                showLabel={false}
                compact
                variant="premium"
                embedded
                tight
              />
            </View>
          </>
        ) : (
          <Text
            style={[styles.heightFieldInput, dense && styles.heightFieldInputDense, styles.fieldReadonlyText]}
            numberOfLines={1}
          >
            {readonlyDisplay}
          </Text>
        )}
      </View>
    </View>
  );
}

function SiblingSidebarSection({
  title,
  fieldKeys,
  form,
  onFieldChange,
  editable,
  dense,
}: {
  title: string;
  fieldKeys: {
    elderBrother: keyof BiodataState;
    youngerBrother: keyof BiodataState;
    elderSister: keyof BiodataState;
    youngerSister: keyof BiodataState;
  };
  form: BiodataState;
  onFieldChange: (field: keyof BiodataState, value: string) => void;
  editable: boolean;
  dense?: boolean;
}) {
  const { translate } = useLanguage();
  const rows: Array<{ key: keyof BiodataState; label: string }> = [
    { key: fieldKeys.elderBrother, label: translate('biodataRelationElderBrother') },
    { key: fieldKeys.youngerBrother, label: translate('biodataRelationYoungerBrother') },
    { key: fieldKeys.elderSister, label: translate('biodataRelationElderSister') },
    { key: fieldKeys.youngerSister, label: translate('biodataRelationYoungerSister') },
  ];

  return (
    <View style={[styles.siblingSidebarSection, dense && styles.siblingSidebarSectionDense]}>
      <Text style={[styles.siblingSidebarTitle, dense && styles.siblingSidebarTitleDense]}>{title}</Text>
      {rows.map((row) => (
        <BiodataSelectRow
          key={row.key}
          label={row.label}
          value={String(form[row.key] ?? '')}
          onValueChange={(text) => onFieldChange(row.key, text)}
          optionsKey="siblingCount"
          editable={editable}
          dense={dense}
          narrow
        />
      ))}
    </View>
  );
}

function MetricBox({
  label,
  value,
  onChangeText,
  onValueChange,
  optionsKey,
  placeholder,
  editable,
  dense,
  sidebar,
  registration,
  compactSidebar,
  familyCompact,
}: {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  onValueChange?: (value: string) => void;
  optionsKey?: FormOptionsKey;
  placeholder?: string;
  editable: boolean;
  dense?: boolean;
  sidebar?: boolean;
  registration?: boolean;
  compactSidebar?: boolean;
  familyCompact?: boolean;
}) {
  const { language } = useLanguage();
  const tamilInputProps = useTamilTextInputProps();
  const sidebarBoxStyle = compactSidebar
    ? [styles.metricBoxSidebarCompact, dense && styles.metricBoxSidebarCompactDense]
    : familyCompact
      ? [styles.metricBoxFamilyCompact, dense && styles.metricBoxFamilyCompactDense]
      : [sidebar && styles.metricBoxSidebar, dense && sidebar && styles.metricBoxSidebarDense];
  const sidebarLabelStyle = compactSidebar
    ? [styles.metricLabelSidebarCompact, dense && styles.metricLabelSidebarCompactDense]
    : familyCompact
      ? [styles.metricLabelFamilyCompact, dense && styles.metricLabelFamilyCompactDense]
      : [sidebar && styles.metricLabelSidebar, dense && sidebar && styles.metricLabelSidebarDense];
  const sidebarInputStyle = compactSidebar
    ? [styles.metricInputSidebarCompact, dense && styles.metricInputSidebarCompactDense]
    : familyCompact
      ? [styles.metricInputFamilyCompact, dense && styles.metricInputFamilyCompactDense]
      : [sidebar && styles.metricInputSidebar, dense && sidebar && styles.metricInputSidebarDense];

  if (optionsKey) {
    const options = useMemo(() => getFormOptions(optionsKey, language), [language, optionsKey]);
    const resolvedValue = useMemo(
      () => resolveStoredOptionValue(optionsKey, value, language),
      [language, optionsKey, value],
    );

    if (!editable) {
      const display = getOptionLabel(optionsKey, resolvedValue, language, value);
      return (
        <View
          style={[
            styles.metricBox,
            ...sidebarBoxStyle,
            dense && styles.metricBoxDense,
          ]}
        >
          <Text
            style={[
              styles.metricLabel,
              ...sidebarLabelStyle,
              dense && styles.metricLabelDense,
            ]}
            numberOfLines={compactSidebar || sidebar ? 2 : 1}
          >
            {label}
          </Text>
          <Text
            style={[
              styles.metricInput,
              ...sidebarInputStyle,
              dense && styles.metricInputDense,
              styles.fieldReadonlyText,
            ]}
          >
            {display || ''}
          </Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.metricBox,
          ...sidebarBoxStyle,
          dense && styles.metricBoxDense,
          styles.selectFieldGroup,
        ]}
      >
        <Text
          style={[
            styles.metricLabel,
            ...sidebarLabelStyle,
            dense && styles.metricLabelDense,
          ]}
          numberOfLines={compactSidebar || sidebar ? 2 : 1}
        >
          {label}
        </Text>
        <SelectField
          label={label}
          value={resolvedValue}
          onValueChange={onValueChange ?? (() => undefined)}
          options={options}
          placeholder={placeholder}
          showLabel={false}
          compact
          variant="premium"
          embedded
          tight={compactSidebar || familyCompact}
        />
      </View>
    );
  }

  const input = (
    <TextInput
      {...tamilInputProps}
      style={[
        styles.metricInput,
        ...sidebarInputStyle,
        dense && styles.metricInputDense,
        registration && styles.metricInputRegistration,
        registration && dense && styles.metricInputRegistrationDense,
      ]}
      value={value}
      onChangeText={onChangeText}
      editable={editable}
      placeholderTextColor={PLACEHOLDER}
    />
  );

  return (
    <View
      style={[
        styles.metricBox,
        ...sidebarBoxStyle,
        dense && styles.metricBoxDense,
        registration && styles.metricBoxRegistration,
      ]}
    >
      <Text
        style={[
          styles.metricLabel,
          ...sidebarLabelStyle,
          dense && styles.metricLabelDense,
        ]}
        numberOfLines={compactSidebar || sidebar ? 2 : 1}
      >
        {label}
      </Text>
      {registration ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regScroll}>
          {input}
        </ScrollView>
      ) : (
        input
      )}
    </View>
  );
}

function RadioOptionGroup({
  label,
  value,
  optionsKey,
  onValueChange,
  editable,
  dense,
  twoColumn,
  threeColumn,
  inlineRow,
  fullWidth,
  familyCompact,
}: {
  label: string;
  value: string;
  optionsKey: FormOptionsKey;
  onValueChange: (value: string) => void;
  editable: boolean;
  dense?: boolean;
  twoColumn?: boolean;
  threeColumn?: boolean;
  inlineRow?: boolean;
  fullWidth?: boolean;
  familyCompact?: boolean;
}) {
  const { language } = useLanguage();
  const options = useMemo(() => getFormOptions(optionsKey, language), [language, optionsKey]);
  const resolvedValue = useMemo(
    () => resolveStoredOptionValue(optionsKey, value, language),
    [language, optionsKey, value],
  );

  if (!editable) {
    const display = getOptionLabel(optionsKey, resolvedValue, language, value);
    return (
      <View style={[styles.radioGroup, dense && styles.radioGroupDense, familyCompact && styles.radioGroupFamilyCompact]}>
        <Text style={[styles.radioGroupLabel, dense && styles.radioGroupLabelDense]}>{label}</Text>
        <Text style={styles.fieldReadonlyText}>{display || ''}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.radioGroup, dense && styles.radioGroupDense, familyCompact && styles.radioGroupFamilyCompact]}>
      <Text style={[styles.radioGroupLabel, dense && styles.radioGroupLabelDense, familyCompact && styles.radioGroupLabelFamilyCompact]}>{label}</Text>
      <View
        style={[
          styles.radioGrid,
          dense && styles.radioGridDense,
          familyCompact && styles.radioGridFamilyCompact,
          twoColumn && styles.radioGridTwoColumn,
          threeColumn && styles.radioGridThreeColumn,
          inlineRow && styles.radioGridInlineRow,
        ]}
      >
        {options.map((option) => {
          const selected = resolvedValue === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onValueChange(option.value)}
              style={[
                styles.radioChip,
                dense && styles.radioChipDense,
                familyCompact && styles.radioChipFamilyCompact,
                twoColumn && styles.radioChipHalf,
                threeColumn && styles.radioChipThird,
                inlineRow && styles.radioChipInline,
                fullWidth && styles.radioChipFull,
                selected && styles.radioChipSelected,
              ]}
            >
              <View style={[styles.radioDot, dense && styles.radioDotDense, selected && styles.radioDotSelected]} />
              <Text
                style={[
                  styles.radioChipText,
                  dense && styles.radioChipTextDense,
                  threeColumn && styles.radioChipTextThird,
                  fullWidth && styles.radioChipTextFull,
                  selected && styles.radioChipTextSelected,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit={!fullWidth}
                minimumFontScale={0.75}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MemberBox({
  title,
  fields,
  editable,
  onChange,
  mobile,
  sidebar,
  countSelect,
}: {
  title: string;
  fields: { key: keyof BiodataState; label: string; value: string }[];
  editable: boolean;
  onChange: (key: keyof BiodataState, value: string) => void;
  mobile?: boolean;
  sidebar?: boolean;
  countSelect?: boolean;
}) {
  const { language } = useLanguage();
  const tamilInputProps = useTamilTextInputProps();
  const countOptions = useMemo(() => getFormOptions('siblingCount', language), [language]);

  return (
    <View
      style={[
        styles.memberBox,
        sidebar && styles.memberBoxSidebar,
        mobile && styles.memberBoxMobile,
        sidebar && mobile && styles.memberBoxSidebarMobile,
      ]}
    >
      <Text
        style={[
          styles.memberTitle,
          sidebar && styles.memberTitleSidebar,
          mobile && styles.memberTitleMobile,
          sidebar && mobile && styles.memberTitleSidebarMobile,
        ]}
        numberOfLines={sidebar ? 2 : 1}
      >
        {title}
      </Text>
      {fields.map((field) => (
        <View
          key={field.key}
          style={[styles.memberRow, sidebar && styles.memberRowSidebar]}
        >
          <Text
            style={[
              styles.memberLabel,
              sidebar && styles.memberLabelSidebar,
              mobile && styles.memberLabelMobile,
              sidebar && mobile && styles.memberLabelSidebarMobile,
            ]}
            numberOfLines={sidebar ? 2 : 1}
          >
            {field.label}
          </Text>
          {countSelect && sidebar ? (
            editable ? (
              <View style={[styles.memberSelectWrap, styles.selectFieldGroup]}>
                <SelectField
                  label={field.label}
                  value={resolveStoredOptionValue('siblingCount', field.value, language)}
                  onValueChange={(text) => onChange(field.key, text)}
                  options={countOptions}
                  showLabel={false}
                  compact
                  variant="premium"
                />
              </View>
            ) : (
              <Text
                style={[
                  styles.memberInput,
                  sidebar && styles.memberInputSidebar,
                  mobile && styles.memberInputMobile,
                  sidebar && mobile && styles.memberInputSidebarMobile,
                  styles.fieldReadonlyText,
                ]}
              >
                {getOptionLabel(
                  'siblingCount',
                  resolveStoredOptionValue('siblingCount', field.value, language),
                  language,
                  field.value,
                ) || ''}
              </Text>
            )
          ) : (
          <TextInput
            {...tamilInputProps}
            style={[
              styles.memberInput,
              sidebar && styles.memberInputSidebar,
              mobile && styles.memberInputMobile,
              sidebar && mobile && styles.memberInputSidebarMobile,
            ]}
            value={field.value}
            onChangeText={(text) => onChange(field.key, text)}
            editable={editable}
            placeholderTextColor={PLACEHOLDER}
          />
          )}
        </View>
      ))}
    </View>
  );
}

function DetailCellPicker({
  value,
  index,
  onChange,
  dense,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
  onLongPressEnterSelect,
}: {
  value: string;
  index: number;
  onChange: (value: string) => void;
  dense?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onLongPressEnterSelect?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const displayValue = value || String(index + 1);
  const isCustomized = value.trim() === '' || (value.trim() !== '' && value !== String(index + 1));

  const handlePress = useCallback(() => {
    if (selectionMode) {
      onToggleSelect?.();
      return;
    }
    setTempValue(value);
    setIsOpen(true);
  }, [onToggleSelect, selectionMode, value]);

  return (
    <>
      <Pressable
        onPress={handlePress}
        onLongPress={onLongPressEnterSelect}
        delayLongPress={280}
        style={{ flex: 1, width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
      >
        <Text
          style={[
            styles.detailCellText,
            dense && styles.detailCellTextDense,
            !value && { color: 'rgba(87, 0, 0, 0.4)' },
            isCustomized && !isSelected && styles.detailCellTextFilled,
            isSelected && styles.detailCellTextSelected,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {displayValue}
        </Text>
      </Pressable>
      <PickerModal visible={isOpen} onClose={() => setIsOpen(false)}>
        <View style={{ padding: 20, alignItems: 'center' }}>
          <TextInput
            style={[styles.fieldInput, { textAlign: 'center', fontSize: 24, width: 100, height: 60 }]}
            value={tempValue}
            onChangeText={(text) => setTempValue(normalizeDetailGridInput(text))}
            keyboardType="number-pad"
            maxLength={2}
            autoFocus
          />
          <View style={{ flexDirection: 'row', marginTop: 20, width: '100%', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(87, 0, 0, 0.12)', paddingTop: 12 }}>
            {value ? (
              <Pressable
                style={[styles.pickerModalClearButton, { flex: 1, marginTop: 0, borderTopWidth: 0 }]}
                onPress={() => {
                  onChange('');
                  setIsOpen(false);
                }}
              >
                <Text style={styles.pickerModalClearButtonText}>Delete</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.pickerModalClearButton, { flex: 1, marginTop: 0, borderTopWidth: 0 }]}
              onPress={() => {
                onChange(tempValue);
                setIsOpen(false);
              }}
            >
              <Text style={[styles.pickerModalClearButtonText, { color: HOROSCOPE_RED }]}>Okay</Text>
            </Pressable>
          </View>
        </View>
      </PickerModal>
    </>
  );
}

function DetailGrid({
  cells,
  editable,
  dense,
  onCellChange,
  translate,
  footer,
}: {
  cells: string[];
  editable: boolean;
  dense?: boolean;
  onCellChange: (index: number, value: string) => void;
  translate: (key: string) => string;
  footer?: ReactNode;
}) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  let cellOffset = 0;

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIndices([]);
  }, []);

  const enterSelectionMode = useCallback((index?: number) => {
    setSelectionMode(true);
    setSelectedIndices(index === undefined ? [] : [index]);
  }, []);

  const toggleIndex = useCallback((index: number) => {
    setSelectedIndices((current) =>
      current.includes(index) ? current.filter((entry) => entry !== index) : [...current, index],
    );
  }, []);

  const deleteSelected = useCallback(() => {
    selectedIndices.forEach((index) => onCellChange(index, ''));
    exitSelectionMode();
  }, [exitSelectionMode, onCellChange, selectedIndices]);

  return (
    <View style={styles.detailGridContainer} nativeID="biodata-print-detail-grid" collapsable={false}>
      {editable ? (
        <View style={styles.detailGridToolbar}>
          {!selectionMode ? (
            <Pressable
              style={styles.detailGridToolbarBtn}
              onPress={() => enterSelectionMode()}
              hitSlop={6}
            >
              <Text style={styles.detailGridToolbarBtnText}>{translate('biodataDetailGridSelect')}</Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                style={[
                  styles.detailGridToolbarBtn,
                  styles.detailGridToolbarBtnPrimary,
                  selectedIndices.length === 0 && styles.detailGridToolbarBtnDisabled,
                ]}
                onPress={deleteSelected}
                disabled={selectedIndices.length === 0}
                hitSlop={6}
              >
                <Text
                  style={[
                    styles.detailGridToolbarBtnText,
                    styles.detailGridToolbarBtnTextPrimary,
                    selectedIndices.length === 0 && styles.detailGridToolbarBtnTextDisabled,
                  ]}
                >
                  {translate('biodataDetailGridDeleteSelected')}
                  {selectedIndices.length > 0 ? ` (${selectedIndices.length})` : ''}
                </Text>
              </Pressable>
              <Pressable style={styles.detailGridToolbarBtn} onPress={exitSelectionMode} hitSlop={6}>
                <Text style={styles.detailGridToolbarBtnText}>{translate('biodataDetailGridCancelSelect')}</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}
      <View style={styles.detailGridWrap}>
        <View style={[styles.detailGrid, footer ? styles.detailGridWithFooter : null]}>
          {DETAIL_GRID_ROW_SIZES.map((rowSize, rowIndex) => {
            const rowStart = cellOffset;
            const rowCells = cells.slice(rowStart, rowStart + rowSize);
            cellOffset += rowSize;

            return (
              <View key={rowIndex} style={styles.detailGridRow}>
                {rowCells.map((cell, colIndex) => {
                  const index = rowStart + colIndex;
                  const isSelected = selectedIndices.includes(index);
                  const isCustomized =
                    cell.trim() === '' || (cell.trim() !== '' && cell !== String(index + 1));
                  return (
                    <View
                      key={index}
                      style={[
                        styles.detailCellWrap,
                        dense && styles.detailCellWrapDense,
                        editable && isCustomized && styles.detailCellWrapFilled,
                        isSelected && styles.detailCellWrapSelected,
                      ]}
                    >
                      {editable ? (
                        <DetailCellPicker
                          value={cell}
                          index={index}
                          onChange={(text) => onCellChange(index, text)}
                          dense={dense}
                          selectionMode={selectionMode}
                          isSelected={isSelected}
                          onToggleSelect={() => toggleIndex(index)}
                          onLongPressEnterSelect={() => enterSelectionMode(index)}
                        />
                      ) : (
                        <Text
                          style={[styles.detailCellText, dense && styles.detailCellTextDense]}
                          numberOfLines={1}
                        >
                          {cell}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
          {footer ? <View style={styles.detailGridFooter}>{footer}</View> : null}
        </View>
      </View>
    </View>
  );
}

function PickerModal({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.pickerModalRoot}>
        <Pressable style={styles.pickerModalBackdrop} onPress={onClose} />
        <View style={styles.pickerModalCard}>
          {title ? <Text style={styles.pickerModalTitle}>{title}</Text> : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

function HoroscopeCellPicker({
  value,
  editable,
  compact,
  isOpen,
  onOpen,
  onClose,
  onChange,
}: {
  value: string;
  editable: boolean;
  compact?: boolean;
  row?: number;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onChange: (value: string) => void;
}) {
  const display = getHoroscopeCellLabel(value);

  if (!editable) {
    return (
      <Text 
        style={[styles.chartCellText, compact && styles.chartCellTextCompact]} 
        numberOfLines={5}
        adjustsFontSizeToFit
        minimumFontScale={0.4}
      >
        {display}
      </Text>
    );
  }

  return (
    <>
      <Pressable
        style={[styles.chartCellPressable, display && styles.chartCellPressableFilled]}
        onPress={onOpen}
      >
        <Text
          style={[
            styles.chartCellText,
            compact && styles.chartCellTextCompact,
            !display && styles.chartCellTextEmpty,
          ]}
          numberOfLines={5}
          adjustsFontSizeToFit
          minimumFontScale={0.4}
        >
          {display}
        </Text>
      </Pressable>

      <PickerModal visible={isOpen} onClose={onClose} title="Select planet">
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="always"
          style={styles.pickerModalScroll}
          contentContainerStyle={styles.pickerModalScrollContent}
        >
          <View style={styles.pickerModalPlanetGrid}>
            {HOROSCOPE_PLANETS.map((planet) => {
              const currentValues = resolveHoroscopeCellValues(value);
              const selected = currentValues.includes(planet.value);
              return (
                <Pressable
                  key={planet.value}
                  style={[styles.pickerModalPlanetOption, selected && styles.pickerModalOptionSelected]}
                  onPress={() => {
                    let newValues;
                    if (selected) {
                      newValues = currentValues.filter((v) => v !== planet.value);
                    } else {
                      newValues = [...currentValues, planet.value];
                    }
                    onChange(newValues.join(','));
                  }}
                >
                  <Text
                    style={[
                      styles.pickerModalPlanetOptionText,
                      selected && styles.pickerModalOptionTextSelected,
                    ]}
                  >
                    {planet.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(87, 0, 0, 0.12)', marginTop: 12 }}>
            {value ? (
              <Pressable
                style={[styles.pickerModalClearButton, { flex: 1, borderTopWidth: 0, marginTop: 0 }]}
                onPress={() => {
                  onChange('');
                  onClose();
                }}
              >
                <Text style={styles.pickerModalClearButtonText}>Delete</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.pickerModalClearButton, { flex: 1, borderTopWidth: 0, marginTop: 0 }]}
              onPress={onClose}
            >
              <Text style={[styles.pickerModalClearButtonText, { color: HOROSCOPE_RED }]}>Okay</Text>
            </Pressable>
          </View>
        </ScrollView>
      </PickerModal>
    </>
  );
}

function HoroscopeChart({
  cells,
  centerLabel,
  centerSubtitle,
  editable,
  onCellChange,
  compact,
  dense,
  printNativeID,
}: {
  cells: string[][];
  centerLabel: string;
  centerSubtitle?: string;
  editable: boolean;
  onCellChange: (row: number, col: number, value: string) => void;
  compact?: boolean;
  dense?: boolean;
  printNativeID?: string;
}) {
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);

  const renderCell = (row: number, col: number) => {
    const isOpen = activeCell?.row === row && activeCell?.col === col;

    return (
      <View
        key={`${row}-${col}`}
        style={[styles.chartCellWrap, compact && styles.chartCellWrapCompact]}
      >
        <HoroscopeCellPicker
          value={cells[row][col]}
          editable={editable}
          compact={compact}
          isOpen={isOpen}
          onOpen={() => setActiveCell({ row, col })}
          onClose={() => setActiveCell(null)}
          onChange={(nextValue) => onCellChange(row, col, nextValue)}
        />
      </View>
    );
  };

  return (
    <View
      nativeID={printNativeID}
      style={[styles.chartBox, dense && styles.chartBoxDense, styles.chartBoxInSlot]}
    >
      <View style={[styles.chartDoubleOuter, styles.chartDoubleOuterFit]}>
        <View style={styles.chartDoubleInner}>
          <View
            style={[
              styles.chartGrid,
              compact && styles.chartGridCompact,
              dense && styles.chartGridDense,
              styles.chartGridInSlot,
              dense && styles.chartGridDenseInSlot,
            ]}
          >
            <View style={styles.chartGridRow}>
              {renderCell(0, 0)}
              {renderCell(0, 1)}
              {renderCell(0, 2)}
              {renderCell(0, 3)}
            </View>

            <View style={styles.chartGridRowDouble}>
              <View style={styles.chartSideStack}>
                {renderCell(1, 0)}
                {renderCell(2, 0)}
              </View>
              <View style={[styles.chartCenter, compact && styles.chartCenterCompact]}>
                <Text
                  style={[styles.chartCenterLabel, compact && styles.chartCenterLabelCompact]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {centerLabel}
                </Text>
                {centerSubtitle ? (
                  <Text
                    style={[styles.chartCenterSubtitle, compact && styles.chartCenterSubtitleCompact]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {centerSubtitle}
                  </Text>
                ) : null}
              </View>
              <View style={styles.chartSideStack}>
                {renderCell(1, 3)}
                {renderCell(2, 3)}
              </View>
            </View>

            <View style={styles.chartGridRow}>
              {renderCell(3, 0)}
              {renderCell(3, 1)}
              {renderCell(3, 2)}
              {renderCell(3, 3)}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function reviewDisplayValue(value: string): string {
  return value.trim();
}

function buildFilledSiblingReviewRows(
  entries: Array<{ label: string; rawValue: string; displayValue: string }>,
): Array<{ label: string; value: string }> {
  return entries
    .filter((entry) => entry.rawValue.trim().length > 0)
    .map((entry) => ({ label: entry.label, value: entry.displayValue }));
}

function reviewUniqueJoin(parts: string[], separator = ' ÔÇö '): string {
  const seen = new Set<string>();

  return parts
    .map((part) => part.trim())
    .filter((part) => {
      if (!part) {
        return false;
      }
      const key = part.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .join(separator);
}

function buildReviewOccupationLine(
  occupationTypeLabel: string,
  occupationRoleLabel: string,
  occupationDesignation: string,
): string {
  return reviewUniqueJoin([occupationTypeLabel, occupationRoleLabel, occupationDesignation]);
}

function reviewOccupationDisplay(
  occupationTypeLabel: string,
  occupationRoleLabel: string,
  occupationDesignation: string,
): string {
  return (
    occupationRoleLabel.trim() ||
    occupationDesignation.trim() ||
    occupationTypeLabel.trim()
  );
}

function reviewDisplayOption(
  optionsKey: FormOptionsKey,
  value: string,
  language: Language,
): string {
  if (!value.trim()) {
    return '';
  }
  const resolved = resolveStoredOptionValue(optionsKey, value, language);
  return getOptionLabel(optionsKey, resolved, language, value) || value.trim();
}

function reviewDisplayHeight(height: string, heightUnit: string, language: Language): string {
  const trimmed = height.trim();
  if (!trimmed) {
    return '';
  }

  const legacyLabel = reviewDisplayOption('height', trimmed, language);
  if (legacyLabel && legacyLabel !== trimmed && /^\d{3}$/.test(trimmed)) {
    return legacyLabel;
  }

  const unit = resolveHeightUnit(heightUnit, trimmed);
  if (unit === 'cm') {
    return language === 'ta' ? `${trimmed} செ.மீ` : `${trimmed} cm`;
  }
  return language === 'ta' ? `${trimmed} அடி` : `${trimmed} ft`;
}

function ReviewDataRow({
  label,
  value,
  expanded = false,
  sidebar = false,
}: {
  label: string;
  value: string;
  expanded?: boolean;
  sidebar?: boolean;
}) {
  const reviewLayout = useContext(ReviewLayoutContext);
  const labelWidthPercent = sidebar
    ? reviewLayout.sidebarLabelWidthPercent
    : reviewLayout.mainLabelWidthPercent;

  return (
    <View
      style={[
        reviewStyles.dataRow,
        sidebar && reviewStyles.dataRowSidebar,
        !sidebar && IS_NATIVE && reviewStyles.dataRowMainNative,
        expanded && reviewStyles.dataRowExpanded,
      ]}
    >
      <View
        style={[
          reviewStyles.dataLabelColonGroup,
          sidebar && reviewStyles.dataLabelColonGroupSidebar,
          IS_NATIVE && reviewStyles.dataLabelColonGroupNative,
          IS_NATIVE && {
            maxWidth: `${labelWidthPercent}%`,
            width: `${labelWidthPercent}%`,
          },
        ]}
      >
        <Text
          style={[
            reviewStyles.dataLabel,
            sidebar && reviewStyles.dataLabelSidebar,
            sidebar && IS_NATIVE && reviewStyles.dataLabelSidebarNative,
            IS_NATIVE && !sidebar && reviewStyles.dataLabelMainNative,
          ]}
          numberOfLines={IS_NATIVE ? 1 : sidebar ? 2 : 3}
          adjustsFontSizeToFit={IS_NATIVE}
          minimumFontScale={0.72}
        >
          {label}
          <Text style={[reviewStyles.dataColon, sidebar && reviewStyles.dataColonSidebar]}>:</Text>
        </Text>
      </View>
      <View style={[reviewStyles.dataValueColumn, sidebar && reviewStyles.dataValueColumnSidebar]}>
        <Text
          style={[
            reviewStyles.dataValue,
            sidebar && reviewStyles.dataValueSidebar,
            !sidebar && IS_NATIVE && reviewStyles.dataValueMainNative,
          ]}
          {...WEB_ANSWER_PROPS}
        >
          {reviewDisplayValue(value)}
        </Text>
      </View>
    </View>
  );
}

function ReviewInlinePair({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
}: {
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
}) {
  const { stackInlinePairs } = useContext(ReviewLayoutContext);

  if (stackInlinePairs) {
    return (
      <>
        <ReviewDataRow label={leftLabel} value={leftValue} />
        <ReviewDataRow label={rightLabel} value={rightValue} />
      </>
    );
  }

  const renderHalf = (label: string, value: string) => (
    <View style={reviewStyles.inlineHalf}>
      <View style={reviewStyles.dataLabelColonGroup}>
        <Text style={reviewStyles.inlineHalfLabel} numberOfLines={2}>
          {label}
        </Text>
        <Text style={reviewStyles.dataColon}>:</Text>
      </View>
      <Text
        style={[
          reviewStyles.inlineHalfValue,
        ]}
        numberOfLines={2}
        {...WEB_ANSWER_PROPS}
      >
        {reviewDisplayValue(value)}
      </Text>
    </View>
  );

  return (
    <View style={reviewStyles.dataRow}>
      {renderHalf(leftLabel, leftValue)}
      <View style={reviewStyles.inlineHalfDivider} />
      {renderHalf(rightLabel, rightValue)}
    </View>
  );
}

function ReviewSidebarBox({ label, value }: { label: string; value: string }) {
  return <ReviewDataRow label={label} value={value} sidebar />;
}

function ReviewSiblingBox({
  title,
  rows,
  wide = false,
  wideBoxStyle,
  nativeID,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
  wide?: boolean;
  wideBoxStyle?: object;
  nativeID?: string;
}) {
  return (
    <View nativeID={nativeID} style={[reviewStyles.siblingSection, wide && wideBoxStyle]}>
      <View style={reviewStyles.siblingSectionTitleRow}>
        <Text style={[reviewStyles.siblingSectionTitle, wide && reviewStyles.siblingSectionTitleWide]}>
          {title}
        </Text>
      </View>
      {rows.map((row) => (
        <ReviewDataRow key={row.label} label={row.label} value={row.value} sidebar />
      ))}
    </View>
  );
}

function formatLetterheadPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 10) {
    return value;
  }
  return `${digits.slice(0, 2)}\u00A0${digits.slice(2, 4)}\u00A0${digits.slice(4, 6)}\u00A0${digits.slice(6, 8)}\u00A0${digits.slice(8)}`;
}

export function PhotoVisibilityToggle({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={[styles.photoToggleTrack, value ? styles.photoToggleTrackOn : styles.photoToggleTrackOff]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={value ? 'Photo on' : 'Photo off'}
    >
      <Text style={[styles.photoToggleLabel, value ? styles.photoToggleLabelOn : styles.photoToggleLabelOff]}>
        {value ? 'ON' : 'OFF'}
      </Text>
      <View style={[styles.photoToggleThumb, value ? styles.photoToggleThumbOn : styles.photoToggleThumbOff]} />
    </Pressable>
  );
}

function BiodataLetterheadHeader({
  registrationNumber,
  translate,
}: {
  registrationNumber: string;
  translate: (key: string) => string;
}) {
  const logoUri = Platform.OS === 'web' ? getLogoUri() : undefined;

  return (
    <View nativeID="biodata-print-letterhead" style={reviewStyles.letterhead}>
      <View style={reviewStyles.letterheadCenter}>
        <Text style={reviewStyles.letterheadInvocation}>
          {translate('biodataBrandAyya')} {translate('biodataBrandThunai')}
        </Text>
        <Text
          style={reviewStyles.letterheadTitle}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
        >
          {translate('biodataOrgTitle')}
        </Text>
        <Text style={reviewStyles.letterheadAddress} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          {translate('biodataOrgAddressLine1')}
        </Text>
        <Text style={reviewStyles.letterheadAddress} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          {translate('biodataOrgAddressLine2')}
        </Text>
        <View style={reviewStyles.letterheadPhones}>
          <View style={reviewStyles.phoneRow}>
            <MaterialCommunityIcons name="whatsapp" size={11} color="#25D366" />
            <Text
              style={reviewStyles.phoneText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {formatLetterheadPhone(translate('biodataOrgPhone1'))}
            </Text>
          </View>
          <View style={reviewStyles.phoneRow}>
            <MaterialCommunityIcons name="whatsapp" size={11} color="#25D366" />
            <Text
              style={reviewStyles.phoneText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {formatLetterheadPhone(translate('biodataOrgPhone2'))}
            </Text>
          </View>
        </View>
      </View>

      <View style={reviewStyles.letterheadRight}>
        <View nativeID="biodata-print-logo" style={reviewStyles.letterheadLogoWrap}>
          {Platform.OS === 'web' && logoUri ? (
            createElement('img', {
              src: logoUri,
              alt: 'Ayya Matrimony',
              style: {
                width: 40,
                height: 40,
                objectFit: 'contain',
                display: 'block',
              },
            })
          ) : (
            <Image source={images.logo} style={reviewStyles.letterheadLogo} resizeMode="contain" />
          )}
        </View>
        <View nativeID="biodata-print-registration" style={reviewStyles.registrationBoxUnderLogo}>
          <Text style={reviewStyles.registrationLabel} numberOfLines={2}>
            {translate('biodataRegistrationNumberLabel')}
          </Text>
          <Text style={reviewStyles.registrationValue} {...WEB_ANSWER_PROPS}>
            {registrationNumber.trim()}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ChristianBiodataReviewSheet({
  form,
  language,
  translate,
  registrationCommunity,
}: {
  form: BiodataState;
  language: Language;
  translate: (key: string) => string;
  registrationCommunity: RegistrationCommunityId;
}) {
  const { getValue } = useProfileForm();
  const nativePlace = form.nativePlace.trim();
  const expectations = getValue('expectations').trim() || getValue('partnerExpectations').trim();

  const degreeLabel = reviewDisplayOption('degreeDetail', form.education, language);
  const occupationTypeLabel = reviewDisplayOption('occupationType', form.occupationType, language);
  const occupationRoleLabel = reviewDisplayOption('occupation', form.occupation, language);
  const occupationDisplay = reviewOccupationDisplay(
    occupationTypeLabel,
    occupationRoleLabel,
    form.occupationDesignation,
  );
  const propertyLine = getPropertyDisplayValue(
    form.propertyDetails,
    language,
    translate,
    form.propertyHouseType,
    form.propertyHouseCount,
  );

  const marriedRows = buildFilledSiblingReviewRows([
    {
      label: translate('biodataRelationElderBrother'),
      rawValue: form.marriedBrother,
      displayValue: reviewDisplayOption('siblingCount', form.marriedBrother, language),
    },
    {
      label: translate('biodataRelationYoungerBrother'),
      rawValue: form.marriedYoungerBrother,
      displayValue: reviewDisplayOption('siblingCount', form.marriedYoungerBrother, language),
    },
    {
      label: translate('biodataRelationElderSister'),
      rawValue: form.marriedSister,
      displayValue: reviewDisplayOption('siblingCount', form.marriedSister, language),
    },
    {
      label: translate('biodataRelationYoungerSister'),
      rawValue: form.marriedYoungerSister,
      displayValue: reviewDisplayOption('siblingCount', form.marriedYoungerSister, language),
    },
  ]);

  const unmarriedRows = buildFilledSiblingReviewRows([
    {
      label: translate('biodataRelationElderBrother'),
      rawValue: form.unmarriedBrother,
      displayValue: reviewDisplayOption('siblingCount', form.unmarriedBrother, language),
    },
    {
      label: translate('biodataRelationYoungerBrother'),
      rawValue: form.unmarriedYoungerBrother,
      displayValue: reviewDisplayOption('siblingCount', form.unmarriedYoungerBrother, language),
    },
    {
      label: translate('biodataRelationElderSister'),
      rawValue: form.unmarriedSister,
      displayValue: reviewDisplayOption('siblingCount', form.unmarriedSister, language),
    },
    {
      label: translate('biodataRelationYoungerSister'),
      rawValue: form.unmarriedYoungerSister,
      displayValue: reviewDisplayOption('siblingCount', form.unmarriedYoungerSister, language),
    },
  ]);

  const showMarriedSection = marriedRows.length > 0;
  const showUnmarriedSection = unmarriedRows.length > 0;

  return (
    <View
      nativeID="biodata-print-root"
      style={[reviewStyles.sheet, christianReviewStyles.sheetFullScreen]}
    >
      <BiodataLetterheadHeader
        registrationNumber={form.registrationNumber}
        translate={translate}
      />
      <View
        nativeID="biodata-print-christian-body"
        style={christianReviewStyles.bodyContent}
      >
        <View
          nativeID="biodata-print-christian-body-row"
          style={[reviewStyles.bodyRow, christianReviewStyles.bodyRowFullScreen]}
        >
        <View
          nativeID="biodata-print-christian-left-pane"
          style={[reviewStyles.leftPane, christianReviewStyles.leftPaneFullScreen]}
        >
          <ReviewDataRow label={translate('biodataReviewName')} value={form.fullName} />
          <ReviewDataRow
            label={translate('gender')}
            value={reviewDisplayOption('gender', form.gender, language)}
          />
          <ReviewDataRow label={translate('biodataReviewDob')} value={form.dateOfBirth} />
          <ReviewDataRow label={translate('religion')} value={reviewDisplayOption('religion', form.religion, language)} />
          <ReviewDataRow label={translate('biodataReviewEducation')} value={degreeLabel} />
          <ReviewDataRow label={translate('biodataReviewOccupation')} value={occupationDisplay} />
          <ReviewDataRow
            label={translate('biodataReviewIncome')}
            value={reviewDisplayOption('monthlyIncome', form.monthlyIncome, language)}
          />
          <ReviewDataRow label={translate('biodataReviewProperty')} value={propertyLine} />
          <ReviewDataRow label={translate('biodataReviewNativePlace')} value={nativePlace} />
          <ReviewDataRow label={translate('biodataReviewResidence')} value={form.irupidam} />
          <ReviewDataRow label={translate('biodataReviewFather')} value={form.fatherName} />
          <ReviewDataRow label={translate('biodataReviewMother')} value={form.motherName} />
          <ReviewDataRow
            label={translate('biodataReviewSeervarisai')}
            value={reviewDisplayOption('seervarisai', form.seervarisai, language)}
          />
          <ReviewDataRow
            label={translate('biodataReviewHeight')}
            value={reviewDisplayHeight(form.height, form.heightUnit, language)}
          />
          <ReviewDataRow
            label={translate('biodataReviewComplexion')}
            value={reviewDisplayOption('complexionBiodata', form.complexion, language)}
          />
          <ReviewDataRow label={translate('biodataReviewExpectation')} value={expectations} />
        </View>

        <View
          nativeID="biodata-print-christian-right-pane"
          style={[
            reviewStyles.rightPane,
            christianReviewStyles.rightPane,
            christianReviewStyles.rightPaneFullScreen,
          ]}
        >
          <View style={[christianReviewStyles.locationBox, christianReviewStyles.locationBoxCompact]}>
            <Text style={reviewStyles.siblingBoxLabel}>{translate('biodataReviewNativePlace')}</Text>
            <Text style={christianReviewStyles.locationValue} {...WEB_ANSWER_PROPS}>
              {reviewDisplayValue(nativePlace)}
            </Text>
          </View>
          <View style={[christianReviewStyles.locationBox, christianReviewStyles.locationBoxCompact]}>
            <Text style={reviewStyles.siblingBoxLabel}>{translate('biodataReviewResidence')}</Text>
            <Text style={christianReviewStyles.locationValue} {...WEB_ANSWER_PROPS}>
              {reviewDisplayValue(form.irupidam)}
            </Text>
          </View>
          {showMarriedSection ? (
            <View style={christianReviewStyles.siblingSectionExpanded}>
              <ReviewSiblingBox
                wide
                wideBoxStyle={christianReviewStyles.siblingBoxWide}
                title={translate('biodataReviewMarried')}
                rows={marriedRows}
              />
            </View>
          ) : null}
          {showUnmarriedSection ? (
            <View style={christianReviewStyles.siblingSectionExpanded}>
              <ReviewSiblingBox
                wide
                wideBoxStyle={christianReviewStyles.siblingBoxWide}
                title={translate('biodataReviewUnmarried')}
                rows={unmarriedRows}
              />
            </View>
          ) : null}
        </View>
      </View>
      </View>
    </View>
  );
}

export function HoroscopeSection({
  form,
  rasiChart,
  amsamChart,
  detailGrid,
  onFieldChange,
  onRasiChartChange,
  onAmsamChartChange,
  onDetailGridChange,
  editable,
  dense,
  translate,
  language,
  hideBasicInputs,
  showSummaryMeta,
  summaryMetaEditable,
}: {
  form: BiodataState;
  rasiChart: string[][];
  amsamChart: string[][];
  detailGrid: string[];
  onFieldChange: (field: keyof BiodataState, value: string) => void;
  onRasiChartChange: (updater: (current: string[][]) => string[][]) => void;
  onAmsamChartChange: (updater: (current: string[][]) => string[][]) => void;
  onDetailGridChange: (updater: (current: string[]) => string[]) => void;
  editable: boolean;
  dense?: boolean;
  translate: any;
  language: any;
  hideBasicInputs?: boolean;
  showSummaryMeta?: boolean;
  summaryMetaEditable?: boolean;
}) {
  const natchathiramOptions = useMemo(
    () => getRegistrationNatchathiramOptions(language, form.rasi),
    [form.rasi, language],
  );

  const handleRasiChange = useCallback(
    (text: string) => {
      onFieldChange('rasi', text);
      if (form.natchathiram && !findHinduRegistrationStar(form.natchathiram, text)) {
        onFieldChange('natchathiram', '');
      }
    },
    [form.natchathiram, onFieldChange],
  );

  return (
    <>
      {!hideBasicInputs && (
        <View style={[styles.chartsContainer, styles.chartsContainerInputs]}>
        <View style={styles.fieldPairRow}>
          <View style={styles.fieldPairItem}>
            <BiodataDateRow
              label={translate('biodataFieldDateOfBirth')}
              value={form.dateOfBirth}
              onValueChange={(text) => onFieldChange('dateOfBirth', text)}
              editable={editable}
              dense={dense}
              placeholder={translate('biodataDatePlaceholder')}
              required
            />
          </View>
          <View style={styles.fieldPairItem}>
            <BiodataTimeRow
              label={translate('biodataFieldBirthTiming')}
              value={form.birthTiming}
              meridiem={form.birthTimingMeridiem}
              onValueChange={(text) => onFieldChange('birthTiming', text)}
              onMeridiemChange={(next) => onFieldChange('birthTimingMeridiem', next)}
              editable={editable}
              dense={dense}
              placeholder={translate('biodataTimePlaceholder')}
            />
          </View>
        </View>
        <View style={styles.fieldPairRow}>
          <View style={styles.fieldPairItem}>
            <BiodataSelectRow
              label={translate('biodataFieldRasi')}
              value={form.rasi}
              onValueChange={handleRasiChange}
              optionsKey="rasi"
              editable={editable}
              dense={dense}
              placeholder={translate('selectRasi')}
              narrow
            />
          </View>
          <View style={styles.fieldPairItem}>
            <BiodataSelectRow
              label={translate('biodataFieldNatchathiramShort')}
              value={form.natchathiram}
              onValueChange={(text) => onFieldChange('natchathiram', text)}
              optionsKey="nakshatra"
              optionsOverride={natchathiramOptions}
              editable={editable}
              dense={dense}
              placeholder={translate('selectNatchathiram')}
              narrow
            />
          </View>
          <View style={styles.fieldPairItem}>
            <BiodataSelectRow
              label={translate('biodataFieldLaknam')}
              value={form.lagnam}
              onValueChange={(text) => onFieldChange('lagnam', text)}
              optionsKey="rasi"
              editable={editable}
              dense={dense}
              placeholder={translate('selectLaknam')}
              narrow
            />
          </View>
        </View>
        </View>
      )}
      <View
        nativeID="biodata-print-charts"
        style={[
          styles.chartsRow,
          dense && styles.chartsRowDense,
          styles.chartsRowSplit,
        ]}
      >
        <View style={styles.chartSlot}>
        <HoroscopeChart
          centerLabel={translate('biodataChartRasi')}
          centerSubtitle={formatLetterheadPhone(translate('biodataOrgPhone2'))}
          cells={rasiChart}
          editable={editable}
          compact={dense}
          dense
          printNativeID="biodata-print-chart-rasi"
          onCellChange={(row, col, value) => {
            onRasiChartChange((current) =>
              current.map((cells, rowIndex) =>
                cells.map((cell, colIndex) => (rowIndex === row && colIndex === col ? value : cell)),
              ),
            );
          }}
        />
        </View>
        <View style={styles.chartSlot}>
        <HoroscopeChart
          centerLabel={translate('biodataChartAmsam')}
          centerSubtitle={formatLetterheadPhone(translate('biodataOrgPhone1'))}
          cells={amsamChart}
          editable={editable}
          compact={dense}
          dense
          printNativeID="biodata-print-chart-amsam"
          onCellChange={(row, col, value) => {
            onAmsamChartChange((current) =>
              current.map((cells, rowIndex) =>
                cells.map((cell, colIndex) => (rowIndex === row && colIndex === col ? value : cell)),
              ),
            );
          }}
        />
        </View>
      </View>

      <View
        nativeID="biodata-print-horoscope-footer"
        style={[styles.horoscopePrintFooter, IS_NATIVE && styles.horoscopePrintFooterNative]}
      >
      <View style={[styles.dasaBalanceContainer, dense && styles.dasaBalanceContainerDense, styles.dasaBalanceContainerFlush]}>
        <DasaBalanceFields
          dasaBalance={form.dasaBalance}
          dasaYear={form.dasaYear}
          dasaMonth={form.dasaMonth}
          dasaDay={form.dasaDay}
          onFieldChange={onFieldChange}
          editable={editable}
          dense={dense}
        />
      </View>

      <DetailGrid
        cells={detailGrid}
        onCellChange={(index, value) => {
          onDetailGridChange((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
          });
        }}
        editable={editable}
        dense={dense}
        translate={translate}
        footer={
          showSummaryMeta ? (
            <ReviewSummaryMetaRow
              sourceLabel={translate('biodataReviewSource')}
              dateLabel={translate('biodataReviewFilledDate')}
              sourceValue={form.biodataSource}
              dateValue={form.biodataFilledDate}
              editable={summaryMetaEditable ?? editable}
              onSourceChange={(value) => onFieldChange('biodataSource', value)}
              onDateChange={(value) => onFieldChange('biodataFilledDate', value)}
              language={language}
              attached
            />
          ) : undefined
        }
      />

      </View>
    </>
  );
}

function BiodataExtrasStepView({
  form,
  rasiChart,
  amsamChart,
  detailGrid,
  onFieldChange,
  onRasiChartChange,
  onAmsamChartChange,
  onDetailGridChange,
  showHoroscope,
  editable,
  dense,
}: {
  form: BiodataState;
  rasiChart: string[][];
  amsamChart: string[][];
  detailGrid: string[];
  onFieldChange: (field: keyof BiodataState, value: string) => void;
  onRasiChartChange: (updater: (current: string[][]) => string[][]) => void;
  onAmsamChartChange: (updater: (current: string[][]) => string[][]) => void;
  onDetailGridChange: (updater: (current: string[]) => string[]) => void;
  showHoroscope: boolean;
  editable: boolean;
  dense?: boolean;
}) {
  const { language } = useLanguage();
  const translate = useCallback((key: keyof typeof translations.en) => t(language, key), [language]);

  if (!showHoroscope) {
    return null;
  }

  return (
    <View style={styles.extrasStepContainer}>
      <HoroscopeSection
        form={form}
        rasiChart={rasiChart}
        amsamChart={amsamChart}
        detailGrid={detailGrid}
        onFieldChange={onFieldChange}
        onRasiChartChange={onRasiChartChange}
        onAmsamChartChange={onAmsamChartChange}
        onDetailGridChange={onDetailGridChange}
        editable={editable}
        dense={dense}
        translate={translate}
        language={language}
      />
    </View>
  );
}

export function HoroscopeStepView({
  form,
  rasiChart,
  amsamChart,
  detailGrid,
  onFieldChange,
  onRasiChartChange,
  onAmsamChartChange,
  onDetailGridChange,
  editable,
  dense,
}: {
  form: BiodataState;
  rasiChart: string[][];
  amsamChart: string[][];
  detailGrid: string[];
  onFieldChange: (field: keyof BiodataState, value: string) => void;
  onRasiChartChange: (updater: (current: string[][]) => string[][]) => void;
  onAmsamChartChange: (updater: (current: string[][]) => string[][]) => void;
  onDetailGridChange: (updater: (current: string[]) => string[]) => void;
  editable: boolean;
  dense?: boolean;
}) {
  const { language } = useLanguage();
  const translate = useCallback((key: keyof typeof translations.en) => t(language, key), [language]);

  return (
    <View style={styles.horoscopeStepContainer}>
      <Text style={styles.horoscopeStepTitle}>{translate('biodataReviewHoroscope')}</Text>
      <HoroscopeSection
        form={form}
        rasiChart={rasiChart}
        amsamChart={amsamChart}
        detailGrid={detailGrid}
        onFieldChange={onFieldChange}
        onRasiChartChange={onRasiChartChange}
        onAmsamChartChange={onAmsamChartChange}
        onDetailGridChange={onDetailGridChange}
        editable={editable}
        dense={dense}
        translate={translate}
        language={language}
      />
    </View>
  );
}

function ReviewSummaryMetaRow({
  sourceLabel,
  dateLabel,
  sourceValue,
  dateValue,
  editable,
  onSourceChange,
  onDateChange,
  language = 'en',
  attached = false,
}: {
  sourceLabel: string;
  dateLabel: string;
  sourceValue: string;
  dateValue: string;
  editable: boolean;
  onSourceChange: (value: string) => void;
  onDateChange: (value: string) => void;
  language?: Language;
  attached?: boolean;
}) {
  const labelStyle = language === 'ta' ? reviewStyles.summaryMetaLabelTamil : reviewStyles.summaryMetaLabel;
  const colonStyle = language === 'ta' ? reviewStyles.summaryMetaColonTamil : reviewStyles.summaryMetaColon;

  const labelSlotStyle = language === 'ta' ? reviewStyles.summaryMetaLabelSlotTamil : reviewStyles.summaryMetaLabelSlot;

  const renderCell = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    placeholder?: string,
    wideInput = false,
  ) => (
    <View style={reviewStyles.summaryMetaCell}>
      <View style={labelSlotStyle}>
        <Text style={labelStyle}>{label}</Text>
      </View>
      <Text style={colonStyle}>:</Text>
      {editable ? (
        <TextInput
          style={[
            reviewStyles.summaryMetaInput,
            wideInput && reviewStyles.summaryMetaDateInput,
          ]}
          {...WEB_ANSWER_PROPS}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="rgba(87, 0, 0, 0.35)"
        />
      ) : (
        <Text
          style={reviewStyles.summaryMetaValue}
          {...WEB_ANSWER_PROPS}
          numberOfLines={1}
        >
          {reviewDisplayValue(value)}
        </Text>
      )}
    </View>
  );

  return (
    <View
      nativeID="biodata-print-summary-meta"
      style={[reviewStyles.summaryMetaRow, attached && reviewStyles.summaryMetaRowAttached]}
    >
      <View style={[reviewStyles.summaryMetaRightGroup, attached && reviewStyles.summaryMetaRightGroupAttached]}>
        {renderCell(sourceLabel, sourceValue, onSourceChange)}
        {renderCell(dateLabel, dateValue, onDateChange, formatBiodataFilledDate(), true)}
      </View>
    </View>
  );
}

function BiodataReviewSheet({
  form,
  rasiChart,
  amsamChart,
  detailGrid,
  onFieldChange,
  onRasiChartChange,
  onAmsamChartChange,
  onDetailGridChange,
  editable,
  dense,
  registrationCommunity,
  religion,
  printRootRef,
}: {
  form: BiodataState;
  rasiChart: string[][];
  amsamChart: string[][];
  detailGrid: string[];
  onFieldChange: (field: keyof BiodataState, value: string) => void;
  onRasiChartChange: (updater: (current: string[][]) => string[][]) => void;
  onAmsamChartChange: (updater: (current: string[][]) => string[][]) => void;
  onDetailGridChange: (updater: (current: string[]) => string[]) => void;
  editable: boolean;
  dense?: boolean;
  registrationCommunity?: string;
  religion?: string;
  printRootRef?: RefObject<View>;
}) {
  const { translate, language } = useLanguage();
  const reviewReligion = normalizeRegistrationReligion(religion ?? form.religion);
  const showHoroscopeFields =
    Boolean(reviewReligion) &&
    !isChristianRegistration(registrationCommunity ?? '', reviewReligion);

  const degreeLabel = reviewDisplayOption('degreeDetail', form.education, language);
  const nameDisplay = form.fullName.trim();
  const occupationTypeLabel = reviewDisplayOption('occupationType', form.occupationType, language);
  const occupationRoleLabel = reviewDisplayOption('occupation', form.occupation, language);
  const occupationDisplay = reviewOccupationDisplay(
    occupationTypeLabel,
    occupationRoleLabel,
    form.occupationDesignation,
  );
  const propertyLine = getPropertyDisplayValue(
    form.propertyDetails,
    language,
    translate,
    form.propertyHouseType,
    form.propertyHouseCount,
  );

  const marriedRows = buildFilledSiblingReviewRows([
    {
      label: translate('biodataRelationElderBrother'),
      rawValue: form.marriedBrother,
      displayValue: reviewDisplayOption('siblingCount', form.marriedBrother, language),
    },
    {
      label: translate('biodataRelationYoungerBrother'),
      rawValue: form.marriedYoungerBrother,
      displayValue: reviewDisplayOption('siblingCount', form.marriedYoungerBrother, language),
    },
    {
      label: translate('biodataRelationElderSister'),
      rawValue: form.marriedSister,
      displayValue: reviewDisplayOption('siblingCount', form.marriedSister, language),
    },
    {
      label: translate('biodataRelationYoungerSister'),
      rawValue: form.marriedYoungerSister,
      displayValue: reviewDisplayOption('siblingCount', form.marriedYoungerSister, language),
    },
  ]);

  const unmarriedRows = buildFilledSiblingReviewRows([
    {
      label: translate('biodataRelationElderBrother'),
      rawValue: form.unmarriedBrother,
      displayValue: reviewDisplayOption('siblingCount', form.unmarriedBrother, language),
    },
    {
      label: translate('biodataRelationYoungerBrother'),
      rawValue: form.unmarriedYoungerBrother,
      displayValue: reviewDisplayOption('siblingCount', form.unmarriedYoungerBrother, language),
    },
    {
      label: translate('biodataRelationElderSister'),
      rawValue: form.unmarriedSister,
      displayValue: reviewDisplayOption('siblingCount', form.unmarriedSister, language),
    },
    {
      label: translate('biodataRelationYoungerSister'),
      rawValue: form.unmarriedYoungerSister,
      displayValue: reviewDisplayOption('siblingCount', form.unmarriedYoungerSister, language),
    },
  ]);

  const showMarriedSection = marriedRows.length > 0;
  const showUnmarriedSection = unmarriedRows.length > 0;

  const nameAndEducation = degreeLabel ? `${nameDisplay} ${degreeLabel}` : nameDisplay;
  const { width: screenWidth } = useWindowDimensions();
  const reviewLayout = useMemo(() => getReviewLayoutMetrics(screenWidth), [screenWidth]);
  const paneStyles = useMemo(
    () =>
      StyleSheet.create({
        leftPane: {
          flex: reviewLayout.leftPaneFlex,
          minWidth: 0,
          flexShrink: 0,
          overflow: 'visible',
        },
        rightPane: {
          flex: reviewLayout.rightPaneFlex,
          minWidth: 0,
          flexShrink: 0,
          overflow: 'visible',
        },
      }),
    [reviewLayout.leftPaneFlex, reviewLayout.rightPaneFlex],
  );

  return (
    <ReviewLayoutContext.Provider value={reviewLayout}>
    <View ref={printRootRef} nativeID="biodata-print-root" style={reviewStyles.sheet} collapsable={false}>
      <BiodataLetterheadHeader
        registrationNumber={form.registrationNumber}
        translate={translate}
      />
      <View nativeID="biodata-print-body-row" style={reviewStyles.bodyRow}>
        <View
          nativeID="biodata-print-left-pane"
          style={[reviewStyles.leftPane, paneStyles.leftPane]}
        >
            <ReviewDataRow label={translate('biodataReviewName')} value={nameAndEducation} />
            <ReviewDataRow
              label={translate('gender')}
              value={reviewDisplayOption('gender', form.gender, language)}
            />
            <ReviewDataRow
              label={translate('maritalStatus')}
              value={reviewDisplayOption('maritalStatusBiodata', form.maritalStatus, language)}
            />
            <ReviewDataRow label={translate('biodataReviewDob')} value={form.dateOfBirth} />
            <ReviewDataRow
              label={translate('religion')}
              value={reviewDisplayOption('religion', form.religion, language)}
            />
            {showHoroscopeFields ? (
              <ReviewDataRow
                label={translate('biodataReviewStar')}
                value={getRegistrationNatchathiramLabel(form.natchathiram, language, form.rasi)}
              />
            ) : null}
            {showHoroscopeFields ? (
              <ReviewInlinePair
                leftLabel={translate('biodataReviewRasi')}
                leftValue={reviewDisplayOption('rasi', form.rasi, language)}
                rightLabel={translate('biodataReviewLagnam')}
                rightValue={reviewDisplayOption('rasi', form.lagnam, language)}
              />
            ) : null}
            <ReviewDataRow label={translate('biodataReviewOccupation')} value={occupationDisplay} />
            <ReviewDataRow
              label={translate('biodataReviewIncome')}
              value={reviewDisplayOption('monthlyIncome', form.monthlyIncome, language)}
            />
            <ReviewDataRow label={translate('biodataReviewProperty')} value={propertyLine} />
            <ReviewDataRow label={translate('biodataReviewFather')} value={form.fatherName} />
            <ReviewDataRow label={translate('biodataReviewMother')} value={form.motherName} />
            <ReviewDataRow label={translate('biodataReviewResidence')} value={form.irupidam} />
            <ReviewDataRow label={translate('biodataReviewNativePlace')} value={form.nativePlace.trim()} />
          </View>

          <View
            nativeID="biodata-print-right-pane"
            style={[reviewStyles.rightPane, paneStyles.rightPane]}
          >
            <ReviewSidebarBox
              label={translate('biodataReviewTotalMembers')}
              value={reviewDisplayValue(form.totalFamilyMembers)}
            />
            <ReviewSidebarBox
              label={translate('biodataReviewBirthOrder')}
              value={reviewDisplayOption('birthOrder', form.birthOrder, language)}
            />
            {showMarriedSection ? (
              <ReviewSiblingBox
                nativeID="biodata-print-sibling-married"
                wide
                title={translate('biodataReviewMarried')}
                rows={marriedRows}
              />
            ) : null}
            {showUnmarriedSection ? (
              <ReviewSiblingBox
                nativeID="biodata-print-sibling-unmarried"
                wide
                title={translate('biodataReviewUnmarried')}
                rows={unmarriedRows}
              />
            ) : null}
            <ReviewSidebarBox
              label={translate('biodataReviewComplexion')}
              value={reviewDisplayOption('complexionBiodata', form.complexion, language)}
            />
            <ReviewSidebarBox
              label={translate('biodataReviewHeight')}
              value={reviewDisplayHeight(form.height, form.heightUnit, language)}
            />
            <ReviewSidebarBox
              label={translate('biodataReviewSeervarisai')}
              value={reviewDisplayOption('seervarisai', form.seervarisai, language)}
            />
          </View>
        </View>

      {showHoroscopeFields ? (
        <View
          nativeID="biodata-print-horoscope-section"
          style={[styles.horoscopeSection, dense && styles.horoscopeSectionDense, reviewStyles.horoscopeSection]}
        >
          <HoroscopeSection
            form={form}
            rasiChart={rasiChart}
            amsamChart={amsamChart}
            detailGrid={detailGrid}
            onFieldChange={onFieldChange}
            onRasiChartChange={onRasiChartChange}
            onAmsamChartChange={onAmsamChartChange}
            onDetailGridChange={onDetailGridChange}
            editable={false}
            dense={dense}
            translate={translate}
            language={language}
            hideBasicInputs={true}
            showSummaryMeta
            summaryMetaEditable={editable}
          />
        </View>
      ) : (
        <ReviewSummaryMetaRow
          sourceLabel={translate('biodataReviewSource')}
          dateLabel={translate('biodataReviewFilledDate')}
          sourceValue={form.biodataSource}
          dateValue={form.biodataFilledDate}
          editable={editable}
          onSourceChange={(value) => onFieldChange('biodataSource', value)}
          onDateChange={(value) => onFieldChange('biodataFilledDate', value)}
          language={language}
        />
      )}
    </View>
    </ReviewLayoutContext.Provider>
  );
}

const reviewTextAndroid = Platform.select({
  android: { includeFontPadding: false as const },
  default: {},
});

const reviewAnswerTextAndroid = Platform.select({
  android: { includeFontPadding: false as const, fontWeight: '600' as const },
  ios: { fontWeight: '600' as const },
  default: {},
});

const reviewStyles = StyleSheet.create({
  sheet: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    overflow: 'hidden',
    flexShrink: 0,
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  letterhead: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 72,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    width: '100%',
    maxWidth: '100%',
  },
  letterheadRight: {
    width: 52,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 4,
    gap: 2,
  },
  letterheadLogoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterheadLogo: {
    width: 40,
    height: 40,
  },
  letterheadCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 2,
  },
  letterheadInvocation: {
    color: colors.primary,
    fontFamily: fonts.interSemi,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
  },
  letterheadTitle: {
    color: colors.primary,
    fontFamily: fonts.playfair,
    fontSize: 13,
    lineHeight: 16,
    textAlign: 'center',
    width: '100%',
  },
  letterheadAddress: {
    color: colors.primary,
    fontFamily: fonts.inter,
    fontSize: 8.5,
    lineHeight: 11,
    textAlign: 'center',
    width: '100%',
  },
  letterheadPhones: {
    flexDirection: 'row',
    flexWrap: IS_NATIVE ? 'wrap' : 'nowrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: IS_NATIVE ? 8 : 14,
    marginTop: 2,
    width: '100%',
    paddingHorizontal: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
  },
  phoneText: {
    flexShrink: 1,
    color: colors.primary,
    fontFamily: fonts.interMedium,
    fontSize: 8.5,
    lineHeight: 11,
  },
  registrationDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    marginVertical: 2,
    flexShrink: 0,
  },
  registrationBox: {
    width: 60,
    minWidth: 60,
    flexShrink: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  registrationBoxUnderLogo: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    paddingTop: 2,
  },
  registrationLabel: {
    color: colors.primary,
    fontFamily: fonts.interSemi,
    fontSize: 7.5,
    lineHeight: 10,
    textAlign: 'center',
  },
  registrationValue: {
    color: REVIEW_ANSWER_COLOR,
    fontFamily: fonts.interSemi,
    fontSize: 13,
    lineHeight: 16,
    textAlign: 'center',
    ...reviewAnswerTextAndroid,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: IS_NATIVE ? 'flex-start' : 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    width: '100%',
    overflow: 'visible',
  },
  summaryMetaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    overflow: 'visible',
    paddingVertical: 4,
    paddingRight: 8,
  },
  summaryMetaRowAttached: {
    paddingVertical: 1,
    paddingRight: 4,
    marginTop: 0,
  },
  summaryMetaRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    gap: IS_NATIVE ? 10 : 16,
    flexShrink: 0,
    flexWrap: 'nowrap',
  },
  summaryMetaRightGroupAttached: {
    gap: IS_NATIVE ? 6 : 10,
  },
  summaryMetaCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexGrow: 0,
    flexShrink: 0,
    gap: 3,
  },
  summaryMetaLabelSlot: {
    minWidth: IS_NATIVE ? 40 : 46,
    flexShrink: 0,
  },
  summaryMetaLabelSlotTamil: {
    minWidth: IS_NATIVE ? 52 : 58,
    flexShrink: 0,
  },
  summaryMetaLabel: {
    color: colors.primary,
    fontFamily: fonts.interMedium,
    fontSize: IS_NATIVE ? 8 : 10,
    lineHeight: IS_NATIVE ? 11 : 13,
    flexShrink: 0,
    textTransform: 'lowercase',
    ...reviewTextAndroid,
  },
  summaryMetaLabelTamil: {
    color: colors.primary,
    fontFamily: fonts.interMedium,
    fontSize: IS_NATIVE ? 8 : 10,
    lineHeight: IS_NATIVE ? 11 : 13,
    flexShrink: 0,
    ...reviewTextAndroid,
  },
  summaryMetaColon: {
    color: colors.primary,
    fontFamily: fonts.interMedium,
    fontSize: IS_NATIVE ? 8 : 10,
    lineHeight: IS_NATIVE ? 11 : 13,
    flexShrink: 0,
    textTransform: 'lowercase',
    ...reviewTextAndroid,
  },
  summaryMetaColonTamil: {
    color: colors.primary,
    fontFamily: fonts.interMedium,
    fontSize: IS_NATIVE ? 8 : 10,
    lineHeight: IS_NATIVE ? 11 : 13,
    flexShrink: 0,
    ...reviewTextAndroid,
  },
  summaryMetaValue: {
    flexGrow: 0,
    flexShrink: 0,
    color: REVIEW_ANSWER_COLOR,
    fontFamily: fonts.interSemi,
    fontSize: IS_NATIVE ? 8 : 10,
    lineHeight: IS_NATIVE ? 11 : 13,
    textAlign: 'left',
    ...reviewAnswerTextAndroid,
  },
  summaryMetaInput: {
    flexGrow: 0,
    flexShrink: 0,
    width: IS_NATIVE ? 64 : 72,
    paddingVertical: 0,
    paddingHorizontal: 0,
    margin: 0,
    borderWidth: 0,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
    color: REVIEW_ANSWER_COLOR,
    fontFamily: fonts.interSemi,
    fontSize: IS_NATIVE ? 8 : 10,
    lineHeight: IS_NATIVE ? 11 : 13,
    textAlign: 'left',
    ...Platform.select({
      web: { outlineStyle: 'none', borderBottomWidth: 0 },
      default: {},
    }),
    ...reviewTextAndroid,
  },
  summaryMetaDateInput: {
    width: IS_NATIVE ? 88 : 96,
  },
  leftPane: {
    flex: 1.38,
    minWidth: 0,
    borderRightWidth: 1,
    borderRightColor: colors.primary,
    overflow: 'visible',
    flexShrink: 0,
  },
  rightPane: {
    flex: 1,
    minWidth: IS_NATIVE ? 0 : 132,
    padding: 0,
    gap: 0,
    backgroundColor: '#ffffff',
    alignSelf: 'stretch',
    overflow: 'visible',
    flexShrink: 0,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(87, 0, 0, 0.12)',
    minHeight: 28,
    paddingVertical: 4,
    paddingLeft: 6,
    paddingRight: 8,
  },
  dataRowSidebar: {
    alignItems: 'center',
    minHeight: 24,
    paddingVertical: 3,
    paddingLeft: 6,
    paddingRight: 6,
  },
  dataRowMainNative: {
    alignItems: 'flex-start',
    paddingRight: 4,
  },
  dataRowExpanded: {
    flex: 1,
    minHeight: 0,
    alignItems: 'flex-start',
  },
  dataLabelColonGroup: {
    flexDirection: 'row',
    flexShrink: 0,
    alignItems: 'flex-start',
    maxWidth: '52%',
    paddingTop: 1,
  },
  dataLabelColonGroupNative: {
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  dataLabelColonGroupSidebar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    paddingTop: 0,
  },
  dataLabelSidebar: {
    color: colors.primary,
    fontFamily: fonts.interBold,
    fontSize: 11,
    lineHeight: 14,
    flexShrink: 1,
    ...reviewTextAndroid,
  },
  dataLabelSidebarNative: {
    fontSize: 9,
    lineHeight: 12,
  },
  dataColonSidebar: {
    color: colors.primary,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: fonts.interBold,
    ...reviewTextAndroid,
  },
  dataValueColumnSidebar: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 6,
    paddingTop: 0,
  },
  dataValueSidebar: {
    color: REVIEW_ANSWER_COLOR,
    fontFamily: fonts.interSemi,
    fontSize: 11,
    lineHeight: 14,
    ...reviewAnswerTextAndroid,
  },
  dataLabelColumn: {
    flexGrow: 0,
    flexShrink: 0,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    paddingTop: 1,
  },
  dataLabel: {
    color: colors.primary,
    fontFamily: fonts.interSemi,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'left',
    flexShrink: 1,
    ...reviewTextAndroid,
  },
  dataLabelMainNative: {
    flexShrink: 0,
    flex: 1,
  },
  dataLabelExpanded: {
    flexShrink: 0,
  },
  dataColon: {
    color: colors.primary,
    fontFamily: fonts.interSemi,
    fontSize: 12,
    lineHeight: 16,
    flexShrink: 0,
    marginLeft: 2,
    ...reviewTextAndroid,
  },
  dataValueColumn: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    paddingLeft: 10,
    paddingTop: 1,
  },
  dataValueMainNative: {
    fontSize: 11,
    lineHeight: 15,
    flexShrink: 1,
  },
  dataValue: {
    color: REVIEW_ANSWER_COLOR,
    fontFamily: fonts.interSemi,
    fontSize: 12,
    lineHeight: 16,
    ...reviewAnswerTextAndroid,
  },
  inlineHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minWidth: 0,
    paddingHorizontal: 2,
  },
  inlineHalfDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(87, 0, 0, 0.12)',
    marginVertical: 4,
    flexShrink: 0,
  },
  inlineHalfLabel: {
    color: colors.primary,
    fontFamily: fonts.interSemi,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'left',
    ...reviewTextAndroid,
  },
  inlineHalfValue: {
    flex: 1,
    minWidth: 0,
    color: REVIEW_ANSWER_COLOR,
    fontFamily: fonts.interSemi,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
    ...reviewAnswerTextAndroid,
  },
  siblingSection: {
    width: '100%',
    alignSelf: 'stretch',
    flexShrink: 0,
    overflow: 'visible',
  },
  siblingSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(87, 0, 0, 0.12)',
    minHeight: 24,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  siblingSectionTitle: {
    color: colors.primary,
    fontFamily: fonts.interBold,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  siblingSectionTitleWide: {
    fontSize: 11,
    lineHeight: 14,
  },
  sidebarPairRow: {
    flexDirection: 'row',
    gap: 4,
    width: '100%',
  },
  sidebarPairItem: {
    flex: 1,
    minWidth: 0,
  },
  siblingBox: {
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.12)',
    borderRadius: 6,
    padding: 5,
    backgroundColor: '#FFFFFF',
    gap: 2,
    width: '100%',
    alignSelf: 'stretch',
  },
  horoscopeSection: {
    padding: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    overflow: 'visible',
    flexShrink: 0,
    width: '100%',
  },
  siblingBoxWide: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    gap: 1,
    flexShrink: 0,
    justifyContent: 'flex-start',
    width: '100%',
  },
  siblingBoxTitle: {
    color: colors.primary,
    fontFamily: fonts.interBold,
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    marginBottom: 2,
  },
  siblingBoxTitleWide: {
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 2,
  },
  siblingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    width: '100%',
    gap: 4,
  },
  siblingRowWide: {
    alignItems: 'center',
    minHeight: 0,
    gap: 4,
    paddingVertical: 0,
    width: '100%',
  },
  siblingLabelColonGroup: {
    flex: 1.15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minWidth: 0,
    flexShrink: 1,
  },
  siblingLabel: {
    color: colors.primary,
    fontFamily: fonts.interBold,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'left',
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  siblingBoxLabel: {
    color: colors.primary,
    fontFamily: fonts.interMedium,
    fontSize: 8,
    lineHeight: 11,
    textAlign: 'left',
  },
  siblingBoxValue: {
    color: REVIEW_ANSWER_COLOR,
    fontFamily: fonts.interSemi,
    fontSize: 8,
    lineHeight: 11,
    textAlign: 'left',
    ...reviewAnswerTextAndroid,
  },
  siblingLabelWide: {
    color: colors.primary,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: fonts.interBold,
  },
  siblingColon: {
    color: colors.primary,
    fontSize: 10,
    lineHeight: 13,
    fontFamily: fonts.interBold,
    flexShrink: 0,
    marginLeft: 1,
  },
  siblingColonWide: {
    fontSize: 10,
    lineHeight: 13,
  },
  siblingValueColumn: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  siblingValue: {
    color: REVIEW_ANSWER_COLOR,
    fontFamily: fonts.interSemi,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'right',
    width: '100%',
    ...reviewAnswerTextAndroid,
  },
  siblingValueWide: {
    color: REVIEW_ANSWER_COLOR,
    fontFamily: fonts.interSemi,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'right',
    width: '100%',
    ...reviewAnswerTextAndroid,
  },
});

const christianReviewStyles = StyleSheet.create({
  sheetFullScreen: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: 14,
    overflow: 'hidden',
  },
  bodyContent: {
    width: '100%',
  },
  bodyRowFullScreen: {
    alignItems: 'flex-start',
  },
  leftPaneFullScreen: {
    flex: 1.35,
    minWidth: 0,
  },
  rightPane: {
    gap: 6,
    paddingVertical: 8,
  },
  rightPaneFullScreen: {
    flex: 1,
    minWidth: 168,
    minHeight: 0,
    maxWidth: '100%',
    paddingHorizontal: 8,
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  locationBox: {
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.12)',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    minHeight: 56,
    gap: 4,
    flexShrink: 0,
  },
  locationBoxCompact: {
    flexShrink: 0,
    flexGrow: 0,
    minHeight: 52,
    paddingVertical: 7,
    paddingHorizontal: 8,
    gap: 3,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  locationBoxExpanded: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
  },
  locationValue: {
    color: REVIEW_ANSWER_COLOR,
    fontFamily: fonts.interSemi,
    fontSize: 12,
    lineHeight: 17,
    ...reviewAnswerTextAndroid,
  },
  siblingSectionExpanded: {
    flexShrink: 0,
    flexGrow: 0,
    width: '100%',
    marginTop: 2,
  },
  siblingBoxWide: {
    flex: 0,
    flexGrow: 0,
    flexShrink: 0,
    justifyContent: 'flex-start',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.primary,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
    marginTop: 8,
    flexShrink: 0,
    backgroundColor: '#FFFBF8',
  },
  feeText: {
    color: colors.primary,
    fontFamily: fonts.interSemi,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    ...Platform.select({
      android: { includeFontPadding: false },
      default: {},
    }),
  },
});

type PhotoToggleSlot = {
  value: boolean;
  onValueChange: (next: boolean) => void;
};

type CreateProfileBiodataFormProps = {
  editable: boolean;
  onSave: (values: Record<string, string>) => void | Promise<void>;
  onStepChange?: (step: number) => void;
  onPhotoToggleSlotChange?: (slot: PhotoToggleSlot | null) => void;
  viewOnly?: boolean;
  profileValues?: Record<string, string>;
  hideActionBar?: boolean;
  getExportOptions?: () => BiodataExportOptions;
  /** @deprecated Summary biodata no longer shows a header photo; kept for API compatibility. */
  exportPhotoOptions?: BiodataExportOptions;
  /** Hint Tamil keyboard on text fields (admin biodata entry). */
  preferTamilKeyboard?: boolean;
  /** Show contact phone field on step 1 (admin add/edit member only). */
  showAdminPhoneField?: boolean;
  /** Admin read-only profile view — show all cloud photo URLs. */
  adminViewProfile?: boolean;
};

function profileValuesSeedKey(profileValues: Record<string, string>): string {
  return (
    profileValues._profileUpdatedAt?.trim() ||
    `${profileValues.registrationNumber ?? ''}|${profileValues.contactPhone ?? profileValues.phoneNumber ?? ''}|${profileValues.fullName ?? ''}`
  );
}

function shouldKeepCurrentPhotos(
  current: string[],
  incoming: string[],
  editable: boolean,
  viewOnly: boolean,
  photosDirty: boolean,
): boolean {
  if (viewOnly || !editable) {
    return false;
  }
  if (photosDirty) {
    return true;
  }
  return current.some(isLocalPhotoUri) && !incoming.some(isLocalPhotoUri);
}

export function CreateProfileBiodataForm({
  editable,
  onSave,
  onStepChange,
  onPhotoToggleSlotChange,
  viewOnly = false,
  profileValues,
  hideActionBar = false,
  preferTamilKeyboard = false,
  showAdminPhoneField = false,
  adminViewProfile = false,
}: CreateProfileBiodataFormProps) {
  const dense = true;
  const { translate, translateFormat, language } = useLanguage();
  const { horizontalInset } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const actionBarBottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8);
  const actionBarHeight = IS_NATIVE ? 56 + actionBarBottomInset : 52;
  const { getValue, setValue, replaceValues, values, isReady } = useProfileForm();
  const [isSaving, setIsSaving] = useState(false);
  const [rasiChart, setRasiChart] = useState(emptyHoroscope);
  const [amsamChart, setAmsamChart] = useState(emptyHoroscope);
  const [detailGrid, setDetailGrid] = useState<string[]>(createDefaultDetailGrid);
  const [photos, setPhotos] = useState<string[]>(() => parseProfilePhotos(''));
  const [showPhotoInBiodata, setShowPhotoInBiodata] = useState(true);
  const [adminContactPhone, setAdminContactPhone] = useState('');

  useEffect(() => {
    ensureBiodataPrintStyles();
    resetCloudPhotoUploadAvailability();
    void getFirebaseFirestore();
    void getFirebaseStorage();
  }, []);
  const photosRef = useRef<string[]>(parseProfilePhotos(''));
  const photosDirtyRef = useRef(false);
  const photosUploadVersionRef = useRef(0);
  const syncDraftSeqRef = useRef(0);
  const formHydratedRef = useRef(false);
  const profileSeedHydratedRef = useRef('');
  const biodataPrintRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [stepState, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const step = viewOnly ? 5 : stepState;
  const [form, setForm] = useState<BiodataState>({
    fullName: '',
    gender: '',
    education: '',
    dateOfBirth: '',
    birthTiming: '',
    birthTimingMeridiem: 'am',
    religion: '',
    natchathiram: '',
    rasi: '',
    lagnam: '',
    occupation: '',
    occupationType: '',
    occupationDesignation: '',
    monthlyIncome: '',
    propertyDetails: '',
    propertyHouseType: '',
    propertyHouseCount: '',
    fatherName: '',
    motherName: '',
    fatherPhone: '',
    motherPhone: '',
    irupidam: '',
    nativePlace: '',
    totalFamilyMembers: '',
    birthOrder: '',
    marriedBrother: '',
    marriedYoungerBrother: '',
    marriedSister: '',
    marriedYoungerSister: '',
    unmarriedBrother: '',
    unmarriedYoungerBrother: '',
    unmarriedSister: '',
    unmarriedYoungerSister: '',
    complexion: '',
    height: '',
    heightUnit: 'ft',
    seervarisai: '',
    dasaBalance: '',
    dasaYear: '',
    dasaMonth: '',
    dasaDay: '',
    registrationNumber: '',
    numSiblings: '',
    maritalStatus: 'unmarried',
    livingStatus: 'with-family',
    eatingHabits: 'veg',
    birthOrderRelation: '',
    biodataSource: '',
    biodataFilledDate: '',
  });

  useEffect(() => {
    if (!profileValues && !isReady) {
      return;
    }

    if (!profileValues && formHydratedRef.current) {
      return;
    }

    if (profileValues) {
      const seedKey = profileValuesSeedKey(profileValues);
      if (editable && !viewOnly) {
        if (profileSeedHydratedRef.current === seedKey) {
          return;
        }
        profileSeedHydratedRef.current = seedKey;
      } else if (viewOnly && profileSeedHydratedRef.current === seedKey) {
        return;
      } else {
        profileSeedHydratedRef.current = seedKey;
      }
    }

    const readValue = (key: string) => profileValues?.[key] ?? getValue(key);

    setRasiChart(parseHoroscope(readValue('biodataHoroscopeRasi')));
    setAmsamChart(parseHoroscope(readValue('biodataHoroscopeAmsam')));
    setDetailGrid(parseDetailGrid(readValue('biodataDetailGrid')));

    const storedRegistration = readValue('registrationNumber').trim();

    setForm({
      fullName: readValue('fullName'),
      gender: readValue('gender'),
      education: readValue('education'),
      dateOfBirth: readValue('dateOfBirth'),
      birthTiming: migrateBirthTimingToTwelveHour(
        readValue('birthTiming'),
        resolveBirthTimingMeridiem(readValue('birthTimingMeridiem'), readValue('birthTiming')),
      ),
      birthTimingMeridiem: resolveBirthTimingMeridiem(
        readValue('birthTimingMeridiem'),
        readValue('birthTiming'),
      ),
      religion: normalizeRegistrationReligion(readValue('religion')),
      natchathiram: readValue('natchathiram'),
      rasi: readValue('rasi'),
      lagnam: readValue('lagnam'),
      occupation: readValue('occupation'),
      occupationType: readValue('occupationType'),
      occupationDesignation: readValue('occupationDesignation'),
      monthlyIncome: readValue('monthlyIncome'),
      propertyDetails: readValue('propertyDetails'),
      propertyHouseType: (readValue('propertyHouseType') as string) || '',
      propertyHouseCount: readValue('propertyHouseCount'),
      fatherName: readValue('fatherName'),
      motherName: readValue('motherName'),
      fatherPhone: normalizePhoneDigits(readValue('fatherPhone')),
      motherPhone: normalizePhoneDigits(readValue('motherPhone')),
      irupidam: readValue('irupidam'),
      nativePlace: readValue('nativePlace'),
      totalFamilyMembers: readValue('totalFamilyMembers'),
      birthOrder: readValue('birthOrder'),
      marriedBrother: readValue('marriedBrother'),
      marriedYoungerBrother: readValue('marriedYoungerBrother'),
      marriedSister: readValue('marriedSister'),
      marriedYoungerSister: readValue('marriedYoungerSister'),
      unmarriedBrother: readValue('unmarriedBrother'),
      unmarriedYoungerBrother: readValue('unmarriedYoungerBrother'),
      unmarriedSister: readValue('unmarriedSister'),
      unmarriedYoungerSister: readValue('unmarriedYoungerSister'),
      complexion: readValue('complexion'),
      height: readValue('height'),
      heightUnit: resolveHeightUnit(readValue('heightUnit'), readValue('height')),
      seervarisai: readValue('seervarisai'),
      dasaBalance: readValue('dasaBalance'),
      dasaYear: readValue('dasaYear'),
      dasaMonth: readValue('dasaMonth'),
      dasaDay: readValue('dasaDay'),
      registrationNumber: storedRegistration,
      numSiblings: readValue('numSiblings'),
      maritalStatus: readValue('maritalStatus') || 'unmarried',
      livingStatus: readValue('livingStatus') || 'with-family',
      eatingHabits: readValue('eatingHabits') || 'veg',
      birthOrderRelation: readValue('birthOrderRelation') || readValue('birthOrder'),
      biodataSource: readValue('biodataSource'),
      biodataFilledDate: readValue('biodataFilledDate') || formatBiodataFilledDate(),
    });
    const mergedPhotos = resolveBiodataFormPhotoSlots(
      {
        [PROFILE_PHOTOS_DRAFT_KEY]: readValue(PROFILE_PHOTOS_DRAFT_KEY),
        [PROFILE_PHOTOS_KEY]: readValue(PROFILE_PHOTOS_KEY),
        profilePhotoUrls: readValue('profilePhotoUrls'),
        approvedProfilePhotoUrls: readValue('approvedProfilePhotoUrls'),
      },
      { viewOnly, adminEntry: showAdminPhoneField, adminView: adminViewProfile },
    );
    setPhotos((current) => {
      if (shouldKeepCurrentPhotos(current, mergedPhotos, editable, viewOnly, photosDirtyRef.current)) {
        return current;
      }
      photosRef.current = mergedPhotos;
      photosDirtyRef.current = false;
      return mergedPhotos;
    });
    setShowPhotoInBiodata(parseBiodataShowPhoto(readValue(BIODATA_SHOW_PHOTO_KEY)));
    if (showAdminPhoneField) {
      setAdminContactPhone(
        normalizePhoneDigits(readValue(CONTACT_PHONE_KEY) || readValue('phoneNumber')),
      );
    }

    if (!profileValues) {
      formHydratedRef.current = true;
    }
  }, [editable, getValue, isReady, profileValues, setValue, showAdminPhoneField, adminViewProfile, viewOnly]);

  useEffect(() => {
    if (profileValues || !isReady) {
      return;
    }
    if (step !== 4 && !viewOnly) {
      return;
    }

    const readValue = (key: string) => values[key]?.trim() || getValue(key).trim();
    const storedName = readValue('fullName');
    if (!storedName) {
      return;
    }
    if (form.fullName.trim() && form.fullName.trim() === storedName) {
      return;
    }

    setRasiChart(parseHoroscope(readValue('biodataHoroscopeRasi')));
    setAmsamChart(parseHoroscope(readValue('biodataHoroscopeAmsam')));
    setDetailGrid(parseDetailGrid(readValue('biodataDetailGrid')));
    setForm({
      fullName: readValue('fullName'),
      gender: readValue('gender'),
      education: readValue('education'),
      dateOfBirth: readValue('dateOfBirth'),
      birthTiming: migrateBirthTimingToTwelveHour(
        readValue('birthTiming'),
        resolveBirthTimingMeridiem(readValue('birthTimingMeridiem'), readValue('birthTiming')),
      ),
      birthTimingMeridiem: resolveBirthTimingMeridiem(
        readValue('birthTimingMeridiem'),
        readValue('birthTiming'),
      ),
      religion: normalizeRegistrationReligion(readValue('religion')),
      natchathiram: readValue('natchathiram'),
      rasi: readValue('rasi'),
      lagnam: readValue('lagnam'),
      occupation: readValue('occupation'),
      occupationType: readValue('occupationType'),
      occupationDesignation: readValue('occupationDesignation'),
      monthlyIncome: readValue('monthlyIncome'),
      propertyDetails: readValue('propertyDetails'),
      propertyHouseType: readValue('propertyHouseType') || '',
      propertyHouseCount: readValue('propertyHouseCount'),
      fatherName: readValue('fatherName'),
      motherName: readValue('motherName'),
      fatherPhone: normalizePhoneDigits(readValue('fatherPhone')),
      motherPhone: normalizePhoneDigits(readValue('motherPhone')),
      irupidam: readValue('irupidam'),
      nativePlace: readValue('nativePlace'),
      totalFamilyMembers: readValue('totalFamilyMembers'),
      birthOrder: readValue('birthOrder'),
      marriedBrother: readValue('marriedBrother'),
      marriedYoungerBrother: readValue('marriedYoungerBrother'),
      marriedSister: readValue('marriedSister'),
      marriedYoungerSister: readValue('marriedYoungerSister'),
      unmarriedBrother: readValue('unmarriedBrother'),
      unmarriedYoungerBrother: readValue('unmarriedYoungerBrother'),
      unmarriedSister: readValue('unmarriedSister'),
      unmarriedYoungerSister: readValue('unmarriedYoungerSister'),
      complexion: readValue('complexion'),
      height: readValue('height'),
      heightUnit: resolveHeightUnit(readValue('heightUnit'), readValue('height')),
      seervarisai: readValue('seervarisai'),
      dasaBalance: readValue('dasaBalance'),
      dasaYear: readValue('dasaYear'),
      dasaMonth: readValue('dasaMonth'),
      dasaDay: readValue('dasaDay'),
      registrationNumber: readValue('registrationNumber') || form.registrationNumber,
      numSiblings: readValue('numSiblings'),
      maritalStatus: readValue('maritalStatus') || 'unmarried',
      livingStatus: readValue('livingStatus') || 'with-family',
      eatingHabits: readValue('eatingHabits') || 'veg',
      birthOrderRelation: readValue('birthOrderRelation') || readValue('birthOrder'),
      biodataSource: readValue('biodataSource'),
      biodataFilledDate: readValue('biodataFilledDate') || formatBiodataFilledDate(),
    });
    const mergedPhotos = resolveBiodataFormPhotoSlots(
      {
        [PROFILE_PHOTOS_DRAFT_KEY]: readValue(PROFILE_PHOTOS_DRAFT_KEY),
        [PROFILE_PHOTOS_KEY]: readValue(PROFILE_PHOTOS_KEY),
        profilePhotoUrls: readValue('profilePhotoUrls'),
        approvedProfilePhotoUrls: readValue('approvedProfilePhotoUrls'),
      },
      { viewOnly, adminEntry: showAdminPhoneField, adminView: adminViewProfile },
    );
    setPhotos((current) => {
      if (shouldKeepCurrentPhotos(current, mergedPhotos, editable, viewOnly, photosDirtyRef.current)) {
        return current;
      }
      photosRef.current = mergedPhotos;
      photosDirtyRef.current = false;
      return mergedPhotos;
    });
    setShowPhotoInBiodata(parseBiodataShowPhoto(readValue(BIODATA_SHOW_PHOTO_KEY)));

    if (!profileValues) {
      void previewRegistrationNumber(
        normalizeRegistrationReligion(readValue('religion')),
        readValue('rasi'),
        readValue('natchathiram'),
      )
        .then((registrationNumber) => {
          if (!registrationNumber || registrationNumber === storedRegistration) {
            return;
          }
          setValue('registrationNumber', registrationNumber);
          setForm((current) => ({ ...current, registrationNumber }));
        })
        .catch(() => undefined);
    }
  }, [
    form.fullName,
    form.registrationNumber,
    getValue,
    isReady,
    profileValues,
    step,
    values,
    viewOnly,
  ]);

  const syncDraftToContext = useCallback(
    async (photoOverride?: string[]) => {
      if (viewOnly) {
        return;
      }

      const syncId = ++syncDraftSeqRef.current;
      const photosToSync = photoOverride ?? photosRef.current;
      const registrationNumber = getValue('registrationNumber').trim() || form.registrationNumber.trim();
      const nextValues = buildBiodataDraftValues({
        form,
        photos: photosToSync,
        rasiChart,
        amsamChart,
        detailGrid,
        showPhotoInBiodata,
        existingValues: values,
        language,
        registrationNumber,
        adminContactPhone: showAdminPhoneField ? adminContactPhone : '',
        autoApprovePhotos: showAdminPhoneField,
      });

      if (syncId !== syncDraftSeqRef.current) {
        return;
      }

      await replaceValues(nextValues);
    },
    [
      adminContactPhone,
      amsamChart,
      detailGrid,
      form,
      getValue,
      language,
      rasiChart,
      replaceValues,
      showAdminPhoneField,
      showPhotoInBiodata,
      values,
      viewOnly,
    ],
  );

  const syncDraftToContextRef = useRef(syncDraftToContext);
  syncDraftToContextRef.current = syncDraftToContext;

  useEffect(() => {
    if (viewOnly || (step !== 3 && step !== 4)) {
      return;
    }
    void syncDraftToContextRef.current().catch(() => undefined);
  }, [step, viewOnly]);

  useEffect(() => {
    if (profileValues) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        void syncDraftToContextRef.current().catch(() => undefined);
      }
    });

    return () => subscription.remove();
  }, [profileValues]);

  const updateField = useCallback(
    (key: keyof BiodataState, value: string) => {
      setForm((current) => ({ ...current, [key]: value }));
      if (!viewOnly) {
        setValue(key, value);
      }
    },
    [setValue, viewOnly],
  );

  const handleHeightUnitChange = useCallback(
    (nextUnit: HeightUnit) => {
      setForm((current) => {
        const sanitized = sanitizeHeightInput(current.height, nextUnit);
        if (!viewOnly) {
          setValue('heightUnit', nextUnit);
          setValue('height', sanitized);
        }
        return { ...current, heightUnit: nextUnit, height: sanitized };
      });
    },
    [setValue, viewOnly],
  );

  const handleReligionChange = useCallback(
    (value: string) => {
      setForm((current) => ({ ...current, religion: value }));
      if (!viewOnly) {
        setValue('religion', value);
      }
    },
    [setValue, viewOnly],
  );

  useEffect(() => {
    const stored = getValue('registrationNumber').trim();
    if (stored && stored !== form.registrationNumber) {
      setForm((current) => ({ ...current, registrationNumber: stored }));
    }
  }, [form.registrationNumber, getValue, values.registrationNumber]);

  const refreshRegistrationNumber = useCallback(async () => {
    if (viewOnly || profileValues) {
      return;
    }

    const religion = normalizeRegistrationReligion(form.religion || getValue('religion'));
    if (!religion) {
      return;
    }

    const rasi = form.rasi.trim() || getValue('rasi').trim();
    const natchathiram = form.natchathiram.trim() || getValue('natchathiram').trim();
    const storedRegistration = getValue('registrationNumber').trim() || form.registrationNumber.trim();

    if (
      storedRegistration &&
      shouldKeepRegistrationNumber(storedRegistration, religion, rasi, natchathiram)
    ) {
      if (storedRegistration !== form.registrationNumber) {
        setForm((current) => ({ ...current, registrationNumber: storedRegistration }));
      }
      return;
    }

    const nextRegistration = await previewRegistrationNumber(religion, rasi, natchathiram);
    if (!nextRegistration || nextRegistration === storedRegistration) {
      return;
    }

    setForm((current) => ({ ...current, registrationNumber: nextRegistration }));
    setValue('registrationNumber', nextRegistration);
  }, [
    form.natchathiram,
    form.rasi,
    form.registrationNumber,
    form.religion,
    getValue,
    profileValues,
    setValue,
    viewOnly,
  ]);

  useEffect(() => {
    void refreshRegistrationNumber().catch(() => undefined);
  }, [refreshRegistrationNumber]);

  const handlePhotosChange = useCallback(
    (nextPhotos: string[]) => {
      photosDirtyRef.current = true;
      photosRef.current = nextPhotos;
      setPhotos(nextPhotos);
      if (viewOnly) {
        return;
      }
      setValue(PROFILE_PHOTOS_KEY, serializeProfilePhotos(nextPhotos));
      setValue(PROFILE_PHOTOS_DRAFT_KEY, serializeProfilePhotos(nextPhotos));
      void syncDraftToContext(nextPhotos).catch(() => undefined);

      if (!nextPhotos.some(isLocalPhotoUri)) {
        return;
      }

      const phone = normalizePhoneDigits(
        showAdminPhoneField
          ? adminContactPhone || getValue(CONTACT_PHONE_KEY) || getValue('phoneNumber')
          : getValue(CONTACT_PHONE_KEY) || getValue('phoneNumber'),
      );
      if (!phone) {
        return;
      }

      const ownerKey = showAdminPhoneField ? `admin-${phone}` : 'current-user';
      const uploadVersion = photosUploadVersionRef.current + 1;
      photosUploadVersionRef.current = uploadVersion;

      void uploadAndSyncProfilePhotosForApproval(nextPhotos, {
        ownerKey,
        setValue,
        getPhone: () => phone,
        getMemberName: () => form.fullName.trim() || getValue('fullName').trim(),
        getProfileValues: () => ({
          ...values,
          fullName: form.fullName.trim() || values.fullName,
          [CONTACT_PHONE_KEY]: phone,
        }),
      })
        .then((result) => {
          if (photosUploadVersionRef.current !== uploadVersion) {
            return;
          }
          if (result.uploaded) {
            photosRef.current = result.photos;
            setPhotos(result.photos);
          }
        })
        .catch(() => undefined);
    },
    [
      adminContactPhone,
      form.fullName,
      getValue,
      setValue,
      showAdminPhoneField,
      syncDraftToContext,
      values,
      viewOnly,
    ],
  );

  const handleAdminContactPhoneChange = useCallback(
    (text: string) => {
      const digits = normalizePhoneDigits(text);
      setAdminContactPhone(digits);
      if (!viewOnly) {
        setValue(CONTACT_PHONE_KEY, digits);
        setValue('phoneNumber', digits);
      }
    },
    [setValue, viewOnly],
  );

  useEffect(() => {
    onPhotoToggleSlotChange?.(null);
  }, [onPhotoToggleSlotChange]);

  useEffect(
    () => () => {
      onPhotoToggleSlotChange?.(null);
    },
    [onPhotoToggleSlotChange],
  );

  const persistForm = useCallback(async (): Promise<Record<string, string>> => {
    const religion = normalizeRegistrationReligion(form.religion || getValue('religion'));
    const rasi = form.rasi.trim() || getValue('rasi').trim();
    const natchathiram = form.natchathiram.trim() || getValue('natchathiram').trim();
    let registrationNumber = getValue('registrationNumber').trim() || form.registrationNumber.trim();
    const photosToPersist = photosRef.current.some(Boolean) ? photosRef.current : photos;

    if (religion) {
      const allocated = await resolveRegistrationNumber({
        religion,
        rasi,
        natchathiram,
        existingNumber: registrationNumber,
      }).catch(() => registrationNumber);
      if (allocated) {
        registrationNumber = allocated;
      }
    }

    const nextValues = buildBiodataDraftValues({
      form,
      photos: photosToPersist,
      rasiChart,
      amsamChart,
      detailGrid,
      showPhotoInBiodata,
      existingValues: values,
      language,
      registrationNumber,
      adminContactPhone: showAdminPhoneField ? adminContactPhone : '',
      autoApprovePhotos: showAdminPhoneField,
    });

    await replaceValues(nextValues);
    return nextValues;
  }, [
    adminContactPhone,
    detailGrid,
    form,
    getValue,
    language,
    rasiChart,
    amsamChart,
    showAdminPhoneField,
    showPhotoInBiodata,
    replaceValues,
    values,
  ]);

  const validateOccupationFields = useCallback(() => {
    return true;
  }, [
    form.occupation,
    form.occupationDesignation,
    form.occupationType,
    translate,
  ]);

  const handleSavePress = useCallback(() => {
    if (isSaving) {
      return;
    }

    void (async () => {
      Keyboard.dismiss();
      await syncDraftToContext().catch(() => undefined);

      const genderRaw =
        form.gender.trim() || values.gender?.trim() || getValue('gender').trim();
      const normalizedGender = resolveStoredOptionValue('gender', genderRaw, language);
      if (normalizedGender !== 'male' && normalizedGender !== 'female') {
        const message = translate('selectGender');
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(message);
        } else {
          Alert.alert(translate('gender'), message);
        }
        return;
      }

      if (!validateOccupationFields()) {
        return;
      }

      setIsSaving(true);
      try {
        const profileValues = await persistForm();
        const readyValues = prepareProfileForPublish(profileValues);
        const missingFields = getProfileIncompleteFields(readyValues);
        if (missingFields.length > 0) {
          const message = formatProfileIncompleteMessage(missingFields, translate, translateFormat);
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.alert(message);
          } else {
            Alert.alert(translate('saveChanges'), message);
          }
          return;
        }

        await Promise.resolve(onSave(profileValues));
      } catch (error) {
        const message =
          error instanceof Error && error.message === 'Profile publish failed'
            ? translate('profileIncompleteSave')
            : translate('profileSaveFailed');
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(message);
        } else {
          Alert.alert(translate('saveChanges'), message);
        }
      } finally {
        setIsSaving(false);
      }
    })();
  }, [
    form.gender,
    getValue,
    isSaving,
    language,
    onSave,
    persistForm,
    syncDraftToContext,
    translate,
    translateFormat,
    validateOccupationFields,
    values.gender,
  ]);

  const handlePrintPress = useCallback(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
      printBiodataSheetWeb();
      return;
    }

    Alert.alert(translate('downloadPdfAlertTitle'), translate('downloadPdfAlertBody'));
  }, [translate]);

  const handleSharePress = useCallback(async () => {
    if (isSharing) {
      return;
    }

    if (Platform.OS === 'web') {
      const lines = [
        `${translate('biodataBrandAyya')} ${translate('biodataBrandThunai')}`,
        `${translate('biodataRegistrationNumberLabel')}: ${form.registrationNumber || ''}`,
        `${translate('biodataReviewName')}: ${form.fullName || ''}`,
        `${translate('biodataReviewDob')}: ${form.dateOfBirth || ''}`,
        `${translate('gender')}: ${getOptionLabel('gender', form.gender, language, form.gender) || ''}`,
        `${translate('biodataReviewOccupation')}: ${form.occupationDesignation || getOptionLabel('occupation', form.occupation, language, form.occupation) || ''}`,
        `${translate('biodataReviewResidence')}: ${form.irupidam || ''}`,
      ].filter(Boolean);

      const message = lines.join('\n');
      const encoded = encodeURIComponent(message);
      const webUrl = `https://wa.me/?text=${encoded}`;

      try {
        window.open(webUrl, '_blank', 'noopener,noreferrer');
      } catch {
        Alert.alert(translate('share'), translate('shareWhatsappUnavailable'));
      }
      return;
    }

    setIsSharing(true);
    try {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      await new Promise((resolve) => setTimeout(resolve, 200));
      await shareBiodataSheetAsImage(biodataPrintRef, {
        fileName: `biodata-${form.registrationNumber || 'profile'}`,
        dialogTitle: translate('share'),
      });
    } catch {
      Alert.alert(translate('share'), translate('shareCaptureFailed'));
    } finally {
      setIsSharing(false);
    }
  }, [form, isSharing, language, translate]);

  useEffect(() => {
    onStepChange?.(step);
  }, [onStepChange, step]);

  const registrationCommunity = profileValues?.registrationCommunity ?? getValue('registrationCommunity');
  const contextReligion = profileValues?.religion ?? getValue('religion');
  const currentReligion = form.religion || contextReligion;
  const isInitiallyChristian = isChristianRegistration(registrationCommunity, '');
  const isCurrentChristian = isChristianRegistration(registrationCommunity, currentReligion);
  const hasReligion = Boolean(form.religion.trim() || currentReligion.trim());
  const showHoroscopeOnExtrasStep = hasReligion && !isCurrentChristian;
  const totalSteps = 5;

  const goToNextStep = useCallback(() => {
    if (step === 1 && !validateOccupationFields()) {
      return;
    }

    const advance = () => {
      setStep((current) => {
        if (current >= totalSteps) {
          return current;
        }
        if (current === 3 && !showHoroscopeOnExtrasStep) {
          return 5;
        }
        return (current + 1) as 1 | 2 | 3 | 4 | 5;
      });
    };

    if (viewOnly) {
      advance();
      return;
    }

    void syncDraftToContext()
      .then(advance)
      .catch(advance);
  }, [
    showHoroscopeOnExtrasStep,
    step,
    syncDraftToContext,
    totalSteps,
    validateOccupationFields,
    viewOnly,
  ]);

  const goToPreviousStep = useCallback(() => {
    const retreat = () => {
      setStep((current) => {
        if (current <= 1) {
          return current;
        }
        if (current === 5 && !showHoroscopeOnExtrasStep) {
          return 3;
        }
        return (current - 1) as 1 | 2 | 3 | 4 | 5;
      });
    };

    if (viewOnly) {
      retreat();
      return;
    }

    void syncDraftToContext()
      .then(retreat)
      .catch(retreat);
  }, [showHoroscopeOnExtrasStep, syncDraftToContext, viewOnly]);

  const isReviewStep = step === 5;
  const isExtrasStep = step === 4;
  const isChristianReview = isReviewStep && isCurrentChristian;
  const isReviewActions = isReviewStep && !viewOnly;
  const reviewEditable = viewOnly ? false : editable;

  const step1Column = (
    <>
            <SectionCard dense={dense}>
              <BiodataRow
                label={translate('biodataFieldName')}
                value={form.fullName}
                onChangeText={(text) => updateField('fullName', text)}
                editable={editable}
                dense={dense}
                placeholder={translate('biodataPlaceholderName')}
              />
              <View style={styles.fieldPairRow}>
                <View style={styles.fieldPairItem}>
                  <BiodataSelectRow
                    label={translate('biodataFieldGender')}
                    value={form.gender}
                    onValueChange={(text) => updateField('gender', text)}
                    optionsKey="gender"
                    editable={editable}
                    dense={dense}
                    placeholder={translate('selectGender')}
                  />
                </View>
                <View style={styles.fieldPairItem}>
                  <BiodataSelectRow
                    label={translate('biodataFieldMaritalStatus')}
                    value={form.maritalStatus}
                    onValueChange={(text) => updateField('maritalStatus', text)}
                    optionsKey="maritalStatusBiodata"
                    editable={editable}
                    dense={dense}
                    placeholder={translate('selectMaritalStatus')}
                  />
                </View>
              </View>
              <View style={styles.fieldPairRow}>
                <View style={styles.fieldPairItem}>
                  <BiodataDateRow
                    label={translate('biodataFieldDateOfBirth')}
                    value={form.dateOfBirth}
                    onValueChange={(text) => updateField('dateOfBirth', text)}
                    editable={editable}
                    dense={dense}
                    placeholder={translate('biodataDatePlaceholder')}
                    required
                  />
                </View>
                <View style={styles.fieldPairItem}>
                  <BiodataSelectRow
                    label={translate('religion')}
                    value={form.religion}
                    onValueChange={handleReligionChange}
                    optionsKey="religion"
                    editable={editable}
                    dense={dense}
                    placeholder={translate('selectReligion')}
                  />
                </View>
              </View>
            </SectionCard>

            <SectionCard dense={dense}>
              <BiodataRow
                label={translate('selectDegree')}
                value={form.education}
                onChangeText={(text) => updateField('education', text)}
                editable={editable}
                dense={dense}
                placeholder={translate('selectDegree')}
              />
              <View style={styles.fieldPairRow}>
                <View style={styles.fieldPairItem}>
                  <BiodataRow
                    label={translate('biodataOccupationMain')}
                    value={form.occupationType}
                    onChangeText={(text) => updateField('occupationType', text)}
                    editable={editable}
                    dense={dense}
                    placeholder={translate('selectOccupationType')}
                  />
                </View>
                <View style={styles.fieldPairItem}>
                  <BiodataRow
                    label={translate('biodataOccupationRole')}
                    value={form.occupation}
                    onChangeText={(text) => updateField('occupation', text)}
                    editable={editable}
                    dense={dense}
                    placeholder={translate('selectOccupationRole')}
                  />
                </View>
              </View>
              <View style={styles.fieldPairRow}>
                <View style={styles.fieldPairItem}>
                  <BiodataRow
                    label={translate('biodataOccupationPosition')}
                    value={form.occupationDesignation}
                    onChangeText={(text) => updateField('occupationDesignation', text)}
                    editable={editable}
                    dense={dense}
                    placeholder={translate('occupationPositionPlaceholder')}
                  />
                </View>
                <View style={styles.fieldPairItem}>
                  <BiodataRow
                    label={translate('biodataFieldIncome')}
                    value={form.monthlyIncome}
                    onChangeText={(text) => updateField('monthlyIncome', text)}
                    editable={editable}
                    dense={dense}
                  />
                </View>
              </View>
              {showAdminPhoneField ? (
                <BiodataRow
                  label={translate('phoneNumber')}
                  value={adminContactPhone}
                  onChangeText={handleAdminContactPhoneChange}
                  editable={editable}
                  dense={dense}
                  placeholder={translate('enterPhone')}
                  keyboardType="phone-pad"
                />
              ) : null}
            </SectionCard>
    </>
  );

  const step3Column = (
    <View style={[styles.leftColumn, styles.leftColumnFull]}>
      <SectionCard dense={dense}>
        <View style={styles.fieldStack}>
          <BiodataRow
            label={translate('biodataFieldProperty')}
            value={
              form.propertyDetails.trim().startsWith('{')
                ? getPropertyDisplayValue(
                    form.propertyDetails,
                    language,
                    translate,
                    form.propertyHouseType,
                    form.propertyHouseCount,
                  )
                : form.propertyDetails
            }
            onChangeText={(text) => {
              updateField('propertyDetails', text);
              if (form.propertyHouseType) {
                updateField('propertyHouseType', '');
              }
              if (form.propertyHouseCount) {
                updateField('propertyHouseCount', '');
              }
            }}
            editable={editable}
            dense={dense}
            multiline
            placeholder={translate('biodataPlaceholderProperty')}
          />
          <BiodataRow
            label={translate('biodataFieldResidence')}
            value={form.irupidam}
            onChangeText={(text) => updateField('irupidam', text)}
            editable={editable}
            dense={dense}
            placeholder={translate('biodataPlaceholderResidence')}
          />
          <BiodataRow
            label={translate('biodataFieldNativePlace')}
            value={form.nativePlace}
            onChangeText={(text) => updateField('nativePlace', text)}
            editable={editable}
            dense={dense}
            placeholder={translate('biodataPlaceholderNativePlace')}
          />
        </View>
      </SectionCard>

      <SectionCard dense={dense}>
        <RadioOptionGroup
          label={translate('biodataFieldComplexion')}
          value={form.complexion}
          optionsKey="complexionBiodata"
          onValueChange={(text) => updateField('complexion', text)}
          editable={editable}
          dense={dense}
          threeColumn
        />
        <View style={styles.fieldPairRow}>
          <View style={styles.fieldPairItem}>
            <BiodataHeightRow
              label={translate('biodataFieldHeight')}
              value={form.height}
              unit={resolveHeightUnit(form.heightUnit, form.height)}
              onValueChange={(text) => updateField('height', text)}
              onUnitChange={handleHeightUnitChange}
              editable={editable}
              dense={dense}
            />
          </View>
          <View style={styles.fieldPairItem}>
            <BiodataRow
              label={translate('biodataFieldSeervarisai')}
              value={form.seervarisai}
              onChangeText={(text) => updateField('seervarisai', text)}
              editable={editable}
              dense={dense}
            />
          </View>
        </View>
      </SectionCard>

      <SectionCard dense={dense}>
        <View style={styles.photoStepSection}>
          <ProfilePhotoUploadStep
            photos={photos}
            skipped={false}
            language={language}
            labels={getPhotoUploadStepLabels(language)}
            onChange={handlePhotosChange}
            onSkip={() => undefined}
            showSkip={false}
            libraryOnly
            skipNativeEditing
          />
        </View>
      </SectionCard>
    </View>
  );

  const step2Column = (
    <>
            <SectionCard dense={dense}>
              <View style={styles.fieldPairRow}>
                <View style={styles.fieldPairItem}>
                  <BiodataRow
                    label={translate('biodataFieldFather')}
                    value={form.fatherName}
                    onChangeText={(text) => updateField('fatherName', text)}
                    editable={editable}
                    dense={dense}
                    placeholder={translate('biodataPlaceholderFather')}
                  />
                </View>
                <View style={styles.fieldPairItem}>
                  <BiodataRow
                    label={translate('biodataFieldMother')}
                    value={form.motherName}
                    onChangeText={(text) => updateField('motherName', text)}
                    editable={editable}
                    dense={dense}
                    placeholder={translate('biodataPlaceholderMother')}
                  />
                </View>
              </View>
              <View style={styles.fieldPairRow}>
                <View style={styles.fieldPairItem}>
                  <BiodataRow
                    label={translate('biodataFieldFatherPhone')}
                    value={form.fatherPhone}
                    onChangeText={(text) => updateField('fatherPhone', normalizePhoneDigits(text))}
                    editable={editable}
                    dense={dense}
                    placeholder={translate('biodataPlaceholderFatherPhone')}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.fieldPairItem}>
                  <BiodataRow
                    label={translate('biodataFieldMotherPhone')}
                    value={form.motherPhone}
                    onChangeText={(text) => updateField('motherPhone', normalizePhoneDigits(text))}
                    editable={editable}
                    dense={dense}
                    placeholder={translate('biodataPlaceholderMotherPhone')}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </SectionCard>

            <SectionCard dense={dense}>
              <View style={styles.fieldPairRow}>
                <View style={styles.fieldPairItem}>
                  <BiodataRow
                    label={translate('biodataFieldTotalMembers')}
                    value={form.totalFamilyMembers}
                    onChangeText={(text) => updateField('totalFamilyMembers', text.replace(/\D/g, ''))}
                    editable={editable}
                    dense={dense}
                    keyboardType="numeric"
                    placeholder="1, 2, 3..."
                  />
                </View>
                <View style={styles.fieldPairItem}>
                  <BiodataRow
                    label={translate('biodataFieldBirthOrder')}
                    value={form.birthOrder}
                    onChangeText={(text) => updateField('birthOrder', text)}
                    editable={editable}
                    dense={dense}
                    keyboardType="numeric"
                    placeholder="1, 2, 3..."
                  />
                </View>
              </View>
            </SectionCard>

            <SectionCard dense={dense}>
              <View style={styles.fieldPairRow}>
                <View style={styles.fieldPairItem}>
                  <SiblingSidebarSection
                    title={translate('biodataFieldMarried')}
                    fieldKeys={{
                      elderBrother: 'marriedBrother',
                      youngerBrother: 'marriedYoungerBrother',
                      elderSister: 'marriedSister',
                      youngerSister: 'marriedYoungerSister',
                    }}
                    form={form}
                    onFieldChange={updateField}
                    editable={editable}
                    dense={dense}
                  />
                </View>
                <View style={styles.fieldPairItem}>
                  <SiblingSidebarSection
                    title={translate('biodataFieldUnmarried')}
                    fieldKeys={{
                      elderBrother: 'unmarriedBrother',
                      youngerBrother: 'unmarriedYoungerBrother',
                      elderSister: 'unmarriedSister',
                      youngerSister: 'unmarriedYoungerSister',
                    }}
                    form={form}
                    onFieldChange={updateField}
                    editable={editable}
                    dense={dense}
                  />
                </View>
              </View>
            </SectionCard>
    </>
  );

  const biodataSheet = (
    <View
      style={[
        styles.sheetCard,
        dense && styles.sheetCardDense,
        isChristianReview && styles.sheetCardFullScreen,
        isReviewStep && styles.sheetCardReviewStep,
      ]}
    >
      {step === 1 ? (
        <View style={[styles.leftColumn, styles.leftColumnFull]}>{step1Column}</View>
      ) : null}
      {step === 2 ? (
        <View style={[styles.leftColumn, styles.leftColumnFull]}>{step2Column}</View>
      ) : null}
      {step === 3 ? step3Column : null}
      {isExtrasStep ? (
        <BiodataExtrasStepView
          form={form}
          rasiChart={rasiChart}
          amsamChart={amsamChart}
          detailGrid={detailGrid}
          onFieldChange={updateField}
          onRasiChartChange={setRasiChart}
          onAmsamChartChange={setAmsamChart}
          onDetailGridChange={setDetailGrid}
          showHoroscope={showHoroscopeOnExtrasStep}
          editable={editable}
          dense={dense}
        />
      ) : null}
      {isReviewStep ? (
        <BiodataReviewSheet
          form={form}
          rasiChart={rasiChart}
          amsamChart={amsamChart}
          detailGrid={detailGrid}
          onFieldChange={updateField}
          onRasiChartChange={setRasiChart}
          onAmsamChartChange={setAmsamChart}
          onDetailGridChange={setDetailGrid}
          editable={reviewEditable}
          dense={dense}
          registrationCommunity={registrationCommunity}
          religion={currentReligion}
          printRootRef={biodataPrintRef}
        />
      ) : null}
    </View>
  );

  return (
    <TamilInputProvider enabled={preferTamilKeyboard}>
    <View
      style={[
        styles.wrapper,
        viewOnly && styles.wrapperEmbedded,
        isChristianReview && styles.wrapperFullScreen,
      ]}
    >
      {viewOnly ? (
        <View style={styles.embeddedContent}>{biodataSheet}</View>
      ) : isChristianReview ? (
        <ScrollView
          ref={scrollRef}
          style={styles.christianReviewScroll}
          contentContainerStyle={styles.christianReviewScrollContent}
          showsVerticalScrollIndicator
          nestedScrollEnabled
          keyboardShouldPersistTaps="always"
        >
          {biodataSheet}
        </ScrollView>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          keyboardShouldPersistTaps="always"
          contentContainerStyle={[
            styles.scrollContent,
            dense && styles.scrollContentDense,
            isReviewStep && IS_NATIVE && styles.scrollContentReviewNative,
            isReviewStep && IS_NATIVE && { paddingHorizontal: horizontalInset },
            isReviewActions && styles.scrollContentReview,
            isReviewActions && IS_NATIVE && { paddingBottom: actionBarHeight + 24 },
          ]}
        >
          {biodataSheet}
        </ScrollView>
      )}

      {!hideActionBar ? (
      <View
        nativeID="biodata-action-bar"
        collapsable={false}
        style={[
          styles.actionBar,
          IS_NATIVE && styles.actionBarNative,
          isReviewActions && styles.actionBarReview,
          viewOnly && styles.actionBarEmbedded,
          isChristianReview && styles.actionBarFullScreen,
          IS_NATIVE && { paddingBottom: actionBarBottomInset },
        ]}
      >
        {viewOnly ? (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.actionButtonPrint,
                styles.actionButtonCompact,
                IS_NATIVE && styles.actionButtonNavEqual,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={handlePrintPress}
            >
              <MaterialIcons name="print" size={IS_NATIVE ? 16 : 14} color={SHEET_BORDER} />
              <Text
                style={[styles.actionButtonPrintText, IS_NATIVE && styles.actionButtonNavText]}
                numberOfLines={1}
              >
                {translate('print')}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.actionButtonPrint,
                styles.actionButtonCompact,
                IS_NATIVE && styles.actionButtonNavEqual,
                (pressed || isSharing) && styles.actionButtonPressed,
                isSharing && styles.actionButtonDisabled,
              ]}
              onPress={handleSharePress}
              disabled={isSharing}
            >
              <MaterialCommunityIcons name="whatsapp" size={IS_NATIVE ? 16 : 14} color="#25D366" />
              <Text
                style={[styles.actionButtonPrintText, IS_NATIVE && styles.actionButtonNavText]}
                numberOfLines={1}
              >
                {translate('share')}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
        {step > 1 && !isReviewActions ? (
          <Pressable
            style={({ pressed }) => [
              styles.actionButtonOutline,
              styles.actionButtonCompact,
              IS_NATIVE && styles.actionButtonNavEqual,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={goToPreviousStep}
          >
            <MaterialIcons name="arrow-back" size={IS_NATIVE ? 16 : 14} color={SHEET_BORDER} />
            <Text
              style={[styles.actionButtonOutlineText, IS_NATIVE && styles.actionButtonNavText]}
              numberOfLines={1}
            >
              {translate('back')}
            </Text>
          </Pressable>
        ) : null}
        {step < totalSteps ? (
          <Pressable
            style={({ pressed }) => [
              styles.actionButtonPrimary,
              styles.actionButtonCompact,
              IS_NATIVE && styles.actionButtonNavEqual,
              step > 1 ? undefined : styles.actionButtonFull,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={goToNextStep}
          >
            <Text
              style={[styles.actionButtonPrimaryText, IS_NATIVE && styles.actionButtonNavTextPrimary]}
              numberOfLines={1}
            >
              {translate('next')}
            </Text>
            <MaterialIcons name="arrow-forward" size={IS_NATIVE ? 16 : 14} color={colors.onPrimary} />
          </Pressable>
        ) : isReviewActions ? (
          <>
            {step > 1 ? (
              <Pressable
                style={({ pressed }) => [
                  styles.actionButtonOutline,
                  styles.actionButtonReviewInline,
                  pressed && styles.actionButtonPressed,
                ]}
                onPress={goToPreviousStep}
                accessibilityRole="button"
              >
                <MaterialIcons name="arrow-back" size={IS_NATIVE ? 14 : 13} color={SHEET_BORDER} />
                <Text
                  style={styles.actionButtonReviewInlineText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {translate('back')}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              style={({ pressed }) => [
                styles.actionButtonPrint,
                styles.actionButtonReviewInline,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={handlePrintPress}
              accessibilityRole="button"
            >
              <MaterialIcons name="print" size={IS_NATIVE ? 14 : 13} color={SHEET_BORDER} />
              <Text
                style={styles.actionButtonReviewInlineText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {translate('print')}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.actionButtonPrint,
                styles.actionButtonReviewInline,
                (pressed || isSharing) && styles.actionButtonPressed,
                isSharing && styles.actionButtonDisabled,
              ]}
              onPress={handleSharePress}
              disabled={isSharing}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="whatsapp" size={IS_NATIVE ? 14 : 13} color="#25D366" />
              <Text
                style={styles.actionButtonReviewInlineText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {translate('share')}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.actionButtonPrimary,
                styles.actionButtonReviewSave,
                (pressed || isSaving) && styles.actionButtonPressed,
                isSaving && styles.actionButtonDisabled,
              ]}
              onPress={handleSavePress}
              disabled={isSaving}
              accessibilityRole="button"
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <MaterialIcons name="check-circle" size={IS_NATIVE ? 14 : 13} color={colors.onPrimary} />
              )}
              <Text
                style={styles.actionButtonReviewSaveText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {translate('saveAndContinue')}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.actionButtonPrint,
                styles.actionButtonCompact,
                IS_NATIVE && styles.actionButtonNavEqual,
                pressed && styles.actionButtonPressed,
              ]}
              onPress={handlePrintPress}
            >
              <MaterialIcons name="print" size={IS_NATIVE ? 16 : 14} color={SHEET_BORDER} />
              <Text
                style={[styles.actionButtonPrintText, IS_NATIVE && styles.actionButtonNavText]}
                numberOfLines={1}
              >
                {translate('print')}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.actionButtonPrint,
                styles.actionButtonCompact,
                IS_NATIVE && styles.actionButtonNavEqual,
                (pressed || isSharing) && styles.actionButtonPressed,
                isSharing && styles.actionButtonDisabled,
              ]}
              onPress={handleSharePress}
              disabled={isSharing}
            >
              <MaterialCommunityIcons name="whatsapp" size={IS_NATIVE ? 16 : 14} color="#25D366" />
              <Text
                style={[styles.actionButtonPrintText, IS_NATIVE && styles.actionButtonNavText]}
                numberOfLines={1}
              >
                {translate('share')}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.actionButtonPrimary,
                styles.actionButtonCompact,
                IS_NATIVE && styles.actionButtonNavEqual,
                (pressed || isSaving) && styles.actionButtonPressed,
                isSaving && styles.actionButtonDisabled,
              ]}
              onPress={handleSavePress}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <MaterialIcons name="check-circle" size={IS_NATIVE ? 16 : 14} color={colors.onPrimary} />
              )}
              <Text
                style={[
                  styles.actionButtonPrimaryText,
                  IS_NATIVE && styles.actionButtonNavTextPrimary,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {translate('saveAndContinue')}
              </Text>
            </Pressable>
          </>
        )}
          </>
        )}
      </View>
      ) : null}
    </View>
    </TamilInputProvider>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#F8F6F4',
  },
  scrollView: {
    flex: 1,
  },
  scrollContentReview: {
    paddingBottom: Platform.OS === 'web' ? 72 : 80,
  },
  wrapperEmbedded: {
    flex: 0,
    flexGrow: 0,
    width: '100%',
  },
  embeddedContent: {
    width: '100%',
  },
  actionBarEmbedded: {
    position: 'relative',
    left: undefined,
    right: undefined,
    bottom: undefined,
    marginTop: 10,
  },
  wrapperFullScreen: {
    backgroundColor: '#F3F7FC',
  },
  fullScreenReviewContainer: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: Platform.OS === 'ios' ? 88 : 80,
  },
  christianReviewScroll: {
    flex: 1,
  },
  christianReviewScrollContent: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: Platform.OS === 'ios' ? 96 : 88,
    flexGrow: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    paddingBottom: 130,
    alignItems: 'stretch',
  },
  scrollContentCompact: {
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 120,
  },
  sheetCard: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLowest,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.08)',
    ...cardShadow,
  },
  sheetCardDense: {
    padding: 12,
    borderRadius: 16,
  },
  sheetCardReviewStep: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    padding: 0,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: {
        shadowOpacity: 0,
        elevation: 0,
      },
    }),
  },
  sheetCardFullScreen: {
    width: '100%',
    maxWidth: undefined,
    alignSelf: 'stretch',
    padding: 0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.08)',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: { boxShadow: '0 8px 24px rgba(87, 0, 0, 0.08)' },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
      },
    }),
  },
  columnsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  columnsRowReview: {
    flexWrap: 'nowrap',
    width: '100%',
  },
  columnsRowStacked: {
    flexDirection: 'column',
    gap: 10,
  },
  leftColumn: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  leftColumnSide: {
    flex: 1.72,
    minWidth: 0,
    gap: 6,
  },
  leftColumnFull: {
    flex: undefined,
    width: '100%',
    maxWidth: '100%',
  },
  rightColumn: {
    flex: 1,
    minWidth: 0,
    gap: 5,
    backgroundColor: SIDEBAR_PANEL_BG,
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.08)',
    ...fieldShadow,
  },
  rightColumnSide: {
    flex: 1,
    minWidth: 158,
    maxWidth: '36%',
    gap: 5,
  },
  rightColumnFull: {
    flex: undefined,
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  rightColumnDense: {
    padding: 10,
    gap: 8,
    borderRadius: 12,
  },
  rightColumnFamilyStep: {
    flex: 1,
    gap: 6,
    padding: 8,
    justifyContent: 'space-between',
  },
  siblingFieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  siblingFieldGridItem: {
    width: '48%',
    flexGrow: 1,
    minWidth: 0,
  },
  siblingSidebarSection: {
    gap: 4,
    backgroundColor: SIDEBAR_CARD_BG,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.06)',
    flex: 1,
    minWidth: 0,
  },
  siblingSectionsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  siblingSectionsStacked: {
    flexDirection: 'column',
    gap: 6,
  },
  siblingSectionColumn: {
    flex: 1,
    minWidth: 0,
  },
  siblingSectionColumnStacked: {
    width: '100%',
    minWidth: 0,
  },
  siblingSidebarSectionDense: {
    padding: 0,
    gap: 5,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  siblingSidebarTitle: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: fonts.interBold,
  },
  siblingSidebarTitleDense: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 2,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.08)',
    borderRadius: 14,
    padding: 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
    marginBottom: 4,
    overflow: 'visible',
  },
  sectionCardDense: {
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 6,
  },
  fieldPairRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  fieldStack: {
    width: '100%',
    gap: 12,
  },
  fieldPairItem: {
    flex: 1,
    minWidth: 0,
  },
  textFieldFullWidth: {
    width: '100%',
    alignSelf: 'stretch',
  },
  fieldPairItemWide: {
    flex: 2.2,
  },
  fieldPairItemCompact: {
    flex: 0.9,
    maxWidth: IS_NATIVE ? undefined : 148,
    minWidth: 0,
  },
  iconFieldShell: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    borderRadius: 12,
    backgroundColor: FIELD_BG,
    overflow: 'hidden',
    minHeight: 40,
    ...fieldShadow,
  },
  iconFieldShellDesktop: {
    minHeight: 44,
    borderRadius: 12,
  },
  iconFieldBadge: {
    width: 34,
    minWidth: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: FIELD_BORDER,
    backgroundColor: '#ffffff',
  },
  iconFieldBadgePressed: {
    opacity: 0.75,
  },
  iconFieldBadgeDesktop: {
    width: 36,
    minWidth: 36,
  },
  iconFieldBody: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  horoscopeNote: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontFamily: fonts.inter,
    marginBottom: 8,
    marginTop: -2,
  },
  horoscopeNoteDesktop: {
    fontSize: 12,
    marginBottom: 10,
  },
  radioGroup: {
    gap: 6,
    backgroundColor: SIDEBAR_CARD_BG,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.06)',
  },
  radioGroupDesktop: {
    gap: 8,
    padding: 10,
    borderRadius: 14,
  },
  radioGroupLabel: {
    color: colors.primary,
    fontSize: 12,
    fontFamily: fonts.interBold,
    textAlign: 'center',
  },
  radioGroupLabelDesktop: {
    fontSize: 12,
    textAlign: 'left',
    color: colors.primary,
    fontFamily: fonts.interSemi,
    marginBottom: 2,
  },
  radioGrid: {
    gap: 6,
  },
  radioGridDesktop: {
    gap: 8,
  },
  radioGridTwoColumn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  radioChipHalf: {
    width: '48%',
    minWidth: 0,
  },
  radioGridThreeColumn: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
  },
  radioChipThird: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 6,
    gap: 4,
    justifyContent: 'center',
  },
  radioChipFull: {
    width: '100%',
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  radioChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.1)',
    backgroundColor: colors.surfaceContainerLowest,
    minWidth: 0,
  },
  radioChipDesktop: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  radioChipSelected: {
    borderColor: colors.primary,
    backgroundColor: '#ffffff',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(87, 0, 0, 0.25)',
    backgroundColor: '#fff',
    flexShrink: 0,
  },
  radioDotDense: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  radioDotSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  radioChipText: {
    flex: 1,
    minWidth: 0,
    color: colors.onSurface,
    fontSize: 10,
    fontFamily: fonts.interMedium,
    textAlign: 'left',
  },
  radioChipTextDesktop: {
    fontSize: 12,
  },
  radioChipTextSelected: {
    color: colors.primary,
    fontFamily: fonts.interSemi,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldGroupMobile: {
    gap: 4,
  },
  fieldGroupDesktop: {
    gap: 8,
  },
  fieldLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 12,
    fontFamily: fonts.interSemi,
    letterSpacing: 0.15,
    opacity: 1,
  },
  fieldLabelMobile: {
    fontSize: 11,
    lineHeight: 14,
  },
  fieldLabelDesktop: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 1,
  },
  fieldInput: {
    backgroundColor: FIELD_BG,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
    color: colors.onSurface,
    fontSize: 14,
    fontFamily: fonts.interMedium,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    ...fieldShadow,
  },
  fieldInputMobile: {
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    borderRadius: 11,
  },
  fieldInputDesktop: {
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderRadius: 12,
  },
  fieldInputWithIcon: {
    flex: 1,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    ...Platform.select({
      web: { boxShadow: 'none' },
      default: {
        shadowOpacity: 0,
        elevation: 0,
      },
    }),
  },
  nameDegreeRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  nameDegreeInput: {
    flex: 1,
    minWidth: 0,
  },
  nameDegreeDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: FIELD_BORDER,
    marginVertical: 4,
  },
  nameDegreeSelect: {
    flex: 1,
    minWidth: 148,
    maxWidth: '52%',
    flexShrink: 0,
  },
  fieldInputMultiline: {
    minHeight: 48,
    textAlignVertical: 'top',
    paddingTop: 6,
  },
  fieldInputMultilineMobile: {
    minHeight: 40,
  },
  fieldInputMultilineDesktop: {
    minHeight: 64,
    paddingTop: 10,
  },
  fieldInputReadonly: {
    backgroundColor: colors.surfaceContainerHigh,
    opacity: 0.96,
  },
  fieldReadonlyText: {
    color: colors.onSurface,
    fontSize: 13,
    fontFamily: fonts.interMedium,
  },
  selectFieldGroup: {
    position: 'relative',
    zIndex: 1,
    overflow: 'visible',
  },
  memberSelectWrap: {
    flex: 1,
    minWidth: 0,
  },
  metricBox: {
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    backgroundColor: FIELD_BG,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    ...fieldShadow,
  },
  metricBoxSidebar: {
    padding: 4,
    borderRadius: 10,
    backgroundColor: SIDEBAR_CARD_BG,
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.06)',
  },
  metricBoxSidebarDesktop: {
    padding: 10,
    borderRadius: 14,
  },
  metricBoxRegistration: {
    backgroundColor: '#FFF0ED',
  },
  metricBoxMobile: {
    padding: spacing.xs,
  },
  metricBoxSidebarMobile: {
    padding: 4,
    borderRadius: 8,
  },
  metricLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 10,
    fontFamily: fonts.interSemi,
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  metricLabelSidebar: {
    fontSize: 8,
    marginBottom: 2,
    textAlign: 'center',
    lineHeight: 10,
    color: colors.primary,
    opacity: 0.9,
  },
  metricLabelSidebarDesktop: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
    textAlign: 'left',
    color: colors.primary,
    fontFamily: fonts.interSemi,
  },
  metricLabelMobile: {
    fontSize: 8,
    marginBottom: 3,
  },
  metricLabelSidebarMobile: {
    fontSize: 8,
    lineHeight: 11,
    marginBottom: 3,
  },
  metricInput: {
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    borderRadius: 12,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    color: colors.onSurface,
    fontSize: 14,
    fontFamily: fonts.interMedium,
    backgroundColor: FIELD_BG,
    ...fieldShadow,
  },
  metricInputSidebar: {
    minHeight: 26,
    paddingHorizontal: 3,
    fontSize: 10,
    fontFamily: fonts.interSemi,
    textAlign: 'center',
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: 'rgba(87, 0, 0, 0.1)',
  },
  metricInputMobile: {
    minHeight: 36,
    fontSize: 13,
  },
  metricInputSidebarMobile: {
    minHeight: 22,
    fontSize: 9,
    paddingHorizontal: 2,
  },
  metricInputRegistration: {
    minWidth: 88,
    fontSize: 10,
    letterSpacing: -0.2,
  },
  metricInputRegistrationMobile: {
    minWidth: 72,
    fontSize: 9,
  },
  regScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  memberBox: {
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    gap: spacing.xs,
    backgroundColor: FIELD_BG,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
  },
  memberBoxSidebar: {
    padding: 3,
    gap: 3,
    borderRadius: 10,
    backgroundColor: SIDEBAR_CARD_BG,
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.06)',
  },
  memberBoxMobile: {
    padding: spacing.xs,
    gap: 4,
  },
  memberBoxSidebarMobile: {
    padding: 3,
    gap: 2,
  },
  memberTitle: {
    color: SHEET_BORDER,
    fontSize: 10,
    fontFamily: fonts.interSemi,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  memberTitleSidebar: {
    fontSize: 8,
    textAlign: 'center',
    lineHeight: 10,
    marginBottom: 3,
    color: colors.primary,
    fontFamily: fonts.interSemi,
    letterSpacing: 0.3,
  },
  memberTitleMobile: {
    fontSize: 8,
    marginBottom: 2,
  },
  memberTitleSidebarMobile: {
    fontSize: 8,
    lineHeight: 11,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  memberRowSidebar: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 3,
  },
  memberLabel: {
    width: 62,
    flexShrink: 0,
    color: colors.onSurfaceVariant,
    fontSize: 10,
    fontFamily: fonts.interMedium,
  },
  memberLabelSidebar: {
    width: '100%',
    fontSize: 8,
    lineHeight: 11,
    textAlign: 'center',
    color: colors.onSurfaceVariant,
  },
  memberLabelMobile: {
    width: 64,
    fontSize: 9,
  },
  memberLabelSidebarMobile: {
    width: '100%',
    fontSize: 8,
    lineHeight: 10,
  },
  memberInput: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    borderRadius: 10,
    minHeight: 32,
    paddingHorizontal: 6,
    color: colors.onSurface,
    fontSize: 12,
    fontFamily: fonts.inter,
    backgroundColor: colors.surfaceContainerLowest,
  },
  memberInputSidebar: {
    width: '100%',
    minHeight: 22,
    paddingHorizontal: 3,
    textAlign: 'center',
    fontSize: 10,
    fontFamily: fonts.interSemi,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLowest,
  },
  memberInputMobile: {
    minHeight: 28,
    fontSize: 11,
  },
  memberInputSidebarMobile: {
    minHeight: 22,
    fontSize: 9,
    paddingHorizontal: 2,
  },
  chartsContainer: {
    width: '100%',
    alignSelf: 'stretch',
    paddingVertical: spacing.xs,
    backgroundColor: '#FFF5F5',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(122, 74, 68, 0.1)',
  },
  chartsContainerInputs: {
    paddingHorizontal: 10,
    marginBottom: spacing.sm,
    marginTop: 0,
    paddingTop: spacing.xs,
  },

  extrasStepContainer: {
    gap: spacing.lg,
    width: '100%',
    overflow: 'visible',
  },
  photoStepSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  photoStepSectionAfterHoroscope: {
    marginTop: spacing.lg,
  },
  photoStepSectionHint: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.inter,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  horoscopeStepContainer: {
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(122, 74, 68, 0.1)',
    marginBottom: spacing.lg,
  },
  horoscopeStepTitle: {
    color: colors.primary,
    fontFamily: fonts.playfairSemi,
    fontSize: 20,
    lineHeight: 24,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  chartsContainerDense: {
    paddingVertical: spacing.xs,
  },
  chartSectionTitle: {
    color: colors.primary,
    fontFamily: fonts.playfairSemi,
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  chartSectionSubtitle: {
    color: colors.primary,
    fontFamily: fonts.inter,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: spacing.sm,
  },
  chartsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'nowrap',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    width: '100%',
  },
  chartsRowSplit: {
    ...Platform.select({
      web: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 6,
      },
      default: {},
    }),
    overflow: 'visible',
    flexShrink: 0,
    width: '100%',
  },
  chartSlot: {
    flex: 1,
    minWidth: 0,
    maxWidth: '50%',
    overflow: 'visible',
    ...Platform.select({
      web: {
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
      },
      default: {},
    }),
  },
  chartsRowDense: {
    gap: 6,
  },
  horoscopeSection: {
    width: '100%',
    marginTop: spacing.sm,
    gap: 8,
    overflow: 'visible',
    flexShrink: 0,
  },
  horoscopeSectionDense: {
    marginTop: 6,
    gap: 6,
  },
  horoscopePrintFooter: {
    width: '100%',
    alignItems: 'stretch',
    gap: IS_NATIVE ? 4 : spacing.sm,
  },
  horoscopePrintFooterNative: {
    flexShrink: 0,
    overflow: 'visible',
    paddingBottom: 4,
  },
  detailGridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailGridTitle: {
    color: colors.primary,
    fontSize: 12,
    fontFamily: fonts.interSemi,
  },
  detailGridTitleDesktop: {
    fontSize: 14,
    fontFamily: fonts.playfairSemi,
  },
  detailGridWrap: {
    borderRadius: borderRadius.sm,
    overflow: 'visible',
    width: '100%',
  },
  horoscopeFooterCard: {
    width: '100%',
    backgroundColor: FIELD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    flexDirection: 'column',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
    ...fieldShadow,
  },
  horoscopeFooterCardDense: {
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 6,
  },
  dasaBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: IS_NATIVE ? 'wrap' : 'nowrap',
    width: '100%',
  },
  dasaBalanceRowDense: {
    gap: 4,
  },
  dasaBalanceStack: {
    width: '100%',
    gap: spacing.xs,
  },
  dasaBalanceStackDense: {
    gap: 6,
  },
  dasaBalanceContainer: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  dasaBalanceContainerDense: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  dasaBalanceContainerFlush: {
    marginTop: 0,
  },
  dasaBalanceTitle: {
    color: colors.onSurface,
    fontSize: 11,
    fontFamily: fonts.interSemi,
    flexShrink: 0,
    minWidth: 32,
    maxWidth: 40,
  },
  dasaBalanceTitleDense: {
    fontSize: 10,
    minWidth: 28,
    maxWidth: 36,
  },
  dasaDateField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dasaDatePrefix: {
    color: colors.onSurface,
    fontSize: 10,
    lineHeight: 12,
    fontFamily: fonts.interSemi,
    flexShrink: 0,
  },
  dasaDatePrefixDense: {
    fontSize: 9,
    lineHeight: 11,
  },
  dasaInlineSelect: {
    flexShrink: 0,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerLowest,
    overflow: 'hidden',
  },
  dasaPlanetSelectWrap: {
    flex: 1,
    minWidth: 100,
    maxWidth: 220,
  },
  dasaYearSelectWrap: {
    flex: 1,
    minWidth: 60,
  },
  dasaMonthSelectWrap: {
    flex: 1,
    minWidth: 48,
  },
  dasaDaySelectWrap: {
    flex: 1,
    minWidth: 48,
  },
  dasaReadonlyValue: {
    color: REVIEW_ANSWER_COLOR,
    fontSize: 12,
    fontFamily: fonts.inter,
    minWidth: 0,
    flexShrink: 1,
    textAlign: 'left',
  },
  dasaReadonlyValueDense: {
    fontSize: 11,
  },
  dasaReadonlyValueEmphasis: {
    color: '#C62828',
    fontFamily: fonts.interSemi,
  },
  dasaReadonlySpreadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    flexWrap: 'nowrap',
    gap: 4,
  },
  dasaReadonlySpreadRowDense: {
    gap: 2,
  },
  dasaReadonlySegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minWidth: 0,
  },
  dasaReadonlySegmentDense: {
    gap: 2,
  },
  dasaReadonlyLabel: {
    color: colors.onSurface,
    fontSize: 10,
    fontFamily: fonts.interSemi,
    flexShrink: 0,
  },
  dasaReadonlyLabelDense: {
    fontSize: 9,
  },
  chartBox: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
  },
  chartBoxDense: {
    flex: 1,
    minWidth: 0,
  },
  chartBoxInSlot: {
    width: '100%',
    flex: 0,
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'stretch',
  },
  chartDoubleOuter: {
    borderWidth: 2.5,
    borderColor: HOROSCOPE_GRID_LINE,
    padding: 0,
    backgroundColor: '#fff',
    overflow: 'visible',
  },
  chartDoubleOuterFit: {
    width: '100%',
    alignSelf: 'stretch',
  },
  chartDoubleInner: {
    borderWidth: 0,
    backgroundColor: '#fff',
    overflow: 'visible',
  },
  chartGrid: {
    width: '100%',
    aspectRatio: 1,
    minHeight: 170,
    flexDirection: 'column',
    backgroundColor: '#fff',
    gap: 0,
    overflow: 'visible',
    borderRightWidth: HOROSCOPE_LINE_WIDTH,
    borderBottomWidth: HOROSCOPE_LINE_WIDTH,
    borderColor: HOROSCOPE_GRID_LINE,
  },
  chartGridCompact: {
    aspectRatio: 1,
  },
  chartGridDense: {
    aspectRatio: 1,
    minHeight: 118,
  },
  chartGridInSlot: {
    width: '100%',
    aspectRatio: 1,
    minHeight: 0,
    height: undefined,
    maxHeight: undefined,
  },
  chartGridDenseInSlot: {
    minHeight: 0,
    height: undefined,
  },
  chartGridRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 0,
  },
  chartGridRowDouble: {
    flex: 2,
    flexDirection: 'row',
    gap: 0,
  },
  chartSideStack: {
    flex: 1,
    flexDirection: 'column',
    gap: 0,
  },
  chartCellWrap: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopWidth: HOROSCOPE_LINE_WIDTH,
    borderLeftWidth: HOROSCOPE_LINE_WIDTH,
    borderColor: HOROSCOPE_GRID_LINE,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 0,
    minWidth: 0,
  },
  chartCellWrapCompact: {},
  chartCellPressable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 1,
  },
  chartCellPressableFilled: {
    backgroundColor: 'rgba(87, 0, 0, 0.06)',
  },
  chartCellText: {
    width: '100%',
    fontSize: 11,
    lineHeight: 14,
    color: HOROSCOPE_RED,
    fontFamily: fonts.interSemi,
    textAlign: 'center',
  },
  chartCellTextCompact: {
    fontSize: 10,
    lineHeight: 13,
  },
  chartCellTextEmpty: {
    color: 'rgba(87, 0, 0, 0.2)',
  },
  pickerModalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  pickerModalCard: {
    width: '100%',
    maxWidth: 300,
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: HOROSCOPE_RED,
    paddingVertical: 12,
    paddingHorizontal: 12,
    zIndex: 2,
    ...Platform.select({
      web: { boxShadow: '0 12px 32px rgba(87, 0, 0, 0.22)' },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
        elevation: 12,
      },
    }),
  },
  pickerModalTitle: {
    color: colors.primary,
    fontSize: 14,
    fontFamily: fonts.interSemi,
    textAlign: 'center',
    marginBottom: 10,
  },
  pickerModalScroll: {
    maxHeight: 360,
  },
  pickerModalScrollContent: {
    paddingBottom: 4,
  },
  pickerModalPlanetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  pickerModalPlanetOption: {
    width: '28%',
    minWidth: 64,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.15)',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  pickerModalPlanetOptionText: {
    fontSize: 16,
    color: HOROSCOPE_RED,
    fontFamily: fonts.interSemi,
    textAlign: 'center',
  },
  pickerModalNumberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  pickerModalNumberOption: {
    width: 44,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  pickerModalNumberOptionText: {
    fontSize: 13,
    color: HOROSCOPE_RED,
    fontFamily: fonts.interSemi,
    textAlign: 'center',
  },
  pickerModalOptionSelected: {
    backgroundColor: 'rgba(87, 0, 0, 0.12)',
    borderColor: HOROSCOPE_RED,
  },
  pickerModalOptionTextSelected: {
    color: colors.primary,
  },
  pickerModalClearButton: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(87, 0, 0, 0.12)',
  },
  pickerModalClearButtonText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    fontFamily: fonts.interSemi,
  },
  chartCellInput: {
    width: '100%',
    flex: 1,
    fontSize: 10,
    color: '#111',
    padding: 2,
    backgroundColor: 'transparent',
  },
  chartCellInputCompact: {
    fontSize: 8,
    padding: 1,
  },
  chartCenter: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderTopWidth: HOROSCOPE_LINE_WIDTH,
    borderLeftWidth: HOROSCOPE_LINE_WIDTH,
    borderColor: HOROSCOPE_GRID_LINE,
    paddingHorizontal: 2,
    paddingVertical: 4,
    gap: 2,
    minWidth: 0,
  },
  chartCenterCompact: {
    paddingHorizontal: 2,
    paddingVertical: 4,
    gap: 2,
  },
  chartCenterLabel: {
    color: HOROSCOPE_RED,
    fontSize: 14,
    fontFamily: fonts.playfairSemi,
    textAlign: 'center',
  },
  chartCenterSubtitle: {
    fontFamily: fonts.interSemi,
    fontSize: 13,
    color: HOROSCOPE_RED,
    textAlign: 'center',
    marginTop: 4,
  },
  chartCenterLabelCompact: {
    fontSize: 12,
  },
  chartCenterSubtitleCompact: {
    fontSize: 11,
  },
  dasaRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  dasaRowCompact: {
    gap: 4,
  },
  dasaLabel: {
    color: colors.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: fonts.interSemi,
    flexShrink: 0,
  },
  dasaLabelCompact: {
    fontSize: 9,
  },
  dasaLabelDesktop: {
    fontSize: 12,
  },
  dasaInput: {
    width: 80,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    borderRadius: borderRadius.md,
    minHeight: 36,
    paddingHorizontal: 6,
    color: colors.onSurface,
    fontSize: 12,
    fontFamily: fonts.inter,
    backgroundColor: colors.surfaceContainerLowest,
    flexShrink: 0,
  },
  dasaInputCompact: {
    width: 64,
    minHeight: 32,
    fontSize: 11,
  },
  dasaInputDesktop: {
    width: 90,
    minHeight: 40,
    fontSize: 13,
  },
  dasaInputSmall: {
    width: 52,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    borderRadius: borderRadius.md,
    minHeight: 34,
    paddingVertical: 6,
    paddingHorizontal: 4,
    textAlign: 'center',
    color: colors.onSurface,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.inter,
    backgroundColor: colors.surfaceContainerLowest,
    flexShrink: 0,
  },
  dasaInputSmallCompact: {
    width: 34,
    minHeight: 32,
    fontSize: 11,
  },
  dasaInputSmallDesktop: {
    width: 48,
    minHeight: 40,
    fontSize: 13,
  },
  detailGrid: {
    borderWidth: 2,
    borderColor: HOROSCOPE_GRID_LINE,
    overflow: 'visible',
    gap: 0,
  },
  detailGridWithFooter: {
    borderBottomWidth: 0,
  },
  detailGridRow: {
    flexDirection: 'row',
    overflow: 'visible',
  },
  detailGridFooter: {
    borderTopWidth: 2,
    borderTopColor: HOROSCOPE_GRID_LINE,
    paddingTop: 1,
    paddingBottom: 1,
    width: '100%',
    backgroundColor: '#fff',
  },
  detailGridContainer: {
    position: 'relative',
    width: '100%',
    flexShrink: 0,
    overflow: 'visible',
    gap: IS_NATIVE ? 4 : 8,
  },
  detailGridToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailGridToolbarBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.18)',
    backgroundColor: colors.surfaceContainerLowest,
  },
  detailGridToolbarBtnPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  detailGridToolbarBtnDisabled: {
    opacity: 0.45,
  },
  detailGridToolbarBtnText: {
    fontSize: 11,
    lineHeight: 14,
    color: colors.primary,
    fontFamily: fonts.interSemi,
  },
  detailGridToolbarBtnTextPrimary: {
    color: '#fff',
  },
  detailGridToolbarBtnTextDisabled: {
    color: '#fff',
  },
  detailGridBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 15,
  },
  detailCellWrap: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: HOROSCOPE_GRID_LINE,
    borderStyle: 'solid',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 22,
    minWidth: 0,
    backgroundColor: '#fff',
  },
  detailCellWrapDense: {
    minHeight: 20,
  },
  detailCellWrapFilled: {
    backgroundColor: '#F0E0F0',
    borderColor: 'rgba(139, 0, 0, 0.45)',
  },
  detailCellWrapSelected: {
    backgroundColor: '#E8C8E8',
    borderColor: colors.primary,
    borderWidth: 2,
  },
  detailCellText: {
    width: '100%',
    fontSize: 9,
    lineHeight: 12,
    color: HOROSCOPE_RED,
    fontFamily: fonts.interSemi,
    textAlign: 'center',
  },
  detailCellTextDense: {
    fontSize: 8,
    lineHeight: 11,
  },
  detailCellTextFilled: {
    color: colors.primary,
    fontFamily: fonts.interBold,
  },
  detailCellTextSelected: {
    color: colors.primary,
    fontFamily: fonts.interBold,
  },
  detailCellInput: {
    width: '100%',
    minHeight: 20,
    fontSize: 9,
    lineHeight: 12,
    color: colors.primary,
    fontFamily: fonts.interSemi,
    paddingHorizontal: 0,
    paddingVertical: 0,
    textAlign: 'center',
    backgroundColor: 'transparent',
  },
  detailCellInputDense: {
    minHeight: 18,
    fontSize: 8,
    lineHeight: 11,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(87, 0, 0, 0.08)',
    ...actionBarShadow,
    ...Platform.select({
      web: {
        cursor: 'default',
      },
      default: {
        elevation: 24,
      },
    }),
  },
  actionBarReview: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
  },
  actionButtonReviewInline: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    minHeight: Platform.OS === 'web' ? 40 : 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 6,
    ...Platform.select({
      web: { cursor: 'pointer' },
      default: {},
    }),
  },
  actionButtonReviewInlineText: {
    color: SHEET_BORDER,
    fontFamily: fonts.interSemi,
    fontSize: Platform.OS === 'web' ? 11 : 10,
    lineHeight: Platform.OS === 'web' ? 14 : 13,
    flexShrink: 1,
    textAlign: 'center',
  },
  actionButtonReviewSave: {
    flex: 1.35,
    flexShrink: 1,
    minWidth: 0,
    minHeight: Platform.OS === 'web' ? 40 : 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    ...Platform.select({
      web: { cursor: 'pointer' },
      default: {},
    }),
  },
  actionButtonReviewSaveText: {
    color: colors.onPrimary,
    fontFamily: fonts.interSemi,
    fontSize: Platform.OS === 'web' ? 11 : 10,
    lineHeight: Platform.OS === 'web' ? 14 : 13,
    flexShrink: 1,
    textAlign: 'center',
  },
  actionBarWebReview: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionButtonWebInline: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 6,
    ...Platform.select({
      web: { cursor: 'pointer' },
      default: {},
    }),
  },
  actionButtonWebInlineText: {
    color: SHEET_BORDER,
    fontFamily: fonts.interSemi,
    fontSize: 11,
    lineHeight: 14,
    flexShrink: 1,
    textAlign: 'center',
  },
  actionButtonWebSave: {
    flex: 1.35,
    flexShrink: 1,
    minWidth: 0,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    ...Platform.select({
      web: { cursor: 'pointer' },
      default: {},
    }),
  },
  actionButtonWebSaveText: {
    color: colors.onPrimary,
    fontFamily: fonts.interSemi,
    fontSize: 11,
    lineHeight: 14,
    flexShrink: 1,
    textAlign: 'center',
  },
  actionBarNative: {
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
  },
  actionBarFullScreen: {
    paddingHorizontal: spacing.sm,
    backgroundColor: '#FFFFFF',
  },
  actionBarCompact: {
    flexDirection: 'column',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
  },
  actionSecondaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  actionButtonFull: {
    width: '100%',
    flex: undefined,
  },
  actionButtonHalf: {
    flex: 1,
  },
  actionButtonCompact: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  actionButtonNavEqual: {
    flex: 1,
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  actionButtonNavText: {
    fontSize: 13,
    lineHeight: 18,
    flexShrink: 1,
    textAlign: 'center',
  },
  actionButtonNavTextPrimary: {
    fontSize: 13,
    lineHeight: 18,
    flexShrink: 1,
    textAlign: 'center',
  },
  photoToggleTrack: {
    flexShrink: 0,
    width: 72,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    borderWidth: 1.5,
    position: 'relative',
  },
  photoToggleTrackOn: {
    backgroundColor: '#4CAF50',
    borderColor: '#66BB6A',
  },
  photoToggleTrackOff: {
    backgroundColor: '#BDBDBD',
    borderColor: '#9E9E9E',
  },
  photoToggleThumb: {
    position: 'absolute',
    top: 3,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    ...Platform.select({
      web: { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
      },
    }),
  },
  photoToggleThumbOn: {
    right: 3,
  },
  photoToggleThumbOff: {
    left: 3,
  },
  photoToggleLabel: {
    position: 'absolute',
    fontFamily: fonts.interSemi,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.4,
  },
  photoToggleLabelOn: {
    left: 10,
    color: '#FFFFFF',
  },
  photoToggleLabelOff: {
    right: 10,
    color: '#424242',
  },
  actionButtonPrint: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(87, 0, 0, 0.22)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: colors.surfaceContainerLowest,
    minHeight: 36,
    ...fieldShadow,
  },
  actionButtonPrintText: {
    color: SHEET_BORDER,
    fontFamily: fonts.interSemi,
    fontSize: 11,
    lineHeight: 14,
    flexShrink: 1,
  },
  actionButtonPrintFull: {
    flex: 1,
    maxWidth: 140,
    alignSelf: 'center',
  },
  actionButtonPressed: {
    opacity: 0.88,
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  actionButtonOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(87, 0, 0, 0.22)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: colors.surfaceContainerLowest,
    minWidth: 0,
    minHeight: 36,
    ...fieldShadow,
  },
  actionButtonOutlineMobile: {
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
    minHeight: 44,
    borderRadius: borderRadius.md,
  },
  actionButtonOutlineText: {
    color: SHEET_BORDER,
    fontFamily: fonts.interSemi,
    fontSize: 11,
    lineHeight: 14,
    flexShrink: 1,
  },
  actionButtonOutlineTextMobile: {
    fontSize: 10,
  },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    minWidth: 0,
    minHeight: 44,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    ...Platform.select({
      web: {
        boxShadow: '0 6px 20px rgba(87, 0, 0, 0.32)',
      },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.32,
        shadowRadius: 12,
        elevation: 6,
      },
    }),
  },
  actionButtonPrimaryCompact: {
    minHeight: 44,
    borderRadius: borderRadius.md,
  },
  iconFieldShellDense: {
    minHeight: 42,
    borderRadius: 12,
  },
  iconFieldBadgeDense: {
    width: 32,
    minWidth: 32,
  },
  radioGroupDense: {
    gap: 6,
    padding: 8,
    borderRadius: 12,
  },
  radioGroupLabelDense: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'left',
    color: colors.primary,
    fontFamily: fonts.interBold,
    marginBottom: 4,
  },
  radioGridDense: {
    gap: 6,
  },
  radioGridInlineRow: {
    flexDirection: 'row',
    gap: 4,
  },
  radioChipInline: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  radioChipDense: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 4,
    minHeight: 38,
  },
  radioChipTextDense: {
    fontSize: 10,
    lineHeight: 13,
  },
  radioChipTextThird: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  radioGroupFamilyCompact: {
    gap: 4,
    padding: 6,
  },
  radioGroupLabelFamilyCompact: {
    fontSize: 10,
    lineHeight: 12,
    marginBottom: 2,
  },
  radioGridFamilyCompact: {
    gap: 4,
  },
  radioChipFamilyCompact: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    minHeight: 32,
  },
  radioChipTextFull: {
    fontSize: 11,
    lineHeight: 14,
  },
  fieldGroupNarrow: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    overflow: 'visible',
  },
  fieldLabelNarrow: {
    fontSize: 10,
    lineHeight: 14,
    minHeight: 14,
    textAlign: 'left',
    fontFamily: fonts.interBold,
  },
  narrowSelectShell: {
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    borderRadius: 10,
    backgroundColor: FIELD_BG,
    minHeight: 32,
    justifyContent: 'center',
    overflow: 'visible',
    ...fieldShadow,
  },
  narrowSelectShellDense: {
    minHeight: 38,
    borderRadius: 10,
  },
  fieldGroupDense: {
    gap: 6,
  },
  fieldLabelDense: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 1,
  },
  requiredMark: {
    color: colors.error,
    fontFamily: fonts.interSemi,
  },
  dateFieldShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    borderRadius: 12,
    backgroundColor: FIELD_BG,
    minHeight: 40,
    overflow: 'hidden',
    ...fieldShadow,
  },
  dateFieldShellDense: {
    minHeight: 42,
    borderRadius: 12,
  },
  dateFieldInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: fonts.interMedium,
    color: colors.onSurface,
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...Platform.select({
      web: { outlineStyle: 'none' },
      default: {},
    }),
  },
  dateFieldInputDense: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  dateFieldIconButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateFieldIconButtonDense: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  datePickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  datePickerSheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: spacing.lg,
  },
  datePickerDoneBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  datePickerDoneText: {
    color: colors.onPrimary,
    fontFamily: fonts.interSemi,
    fontSize: 14,
  },
  fieldInputDense: {
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    borderRadius: 10,
  },
  heightFieldShell: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    borderRadius: 12,
    backgroundColor: FIELD_BG,
    minHeight: 40,
    overflow: 'visible',
    ...fieldShadow,
  },
  heightFieldShellDense: {
    minHeight: 40,
    borderRadius: 10,
  },
  heightFieldInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: fonts.interMedium,
    color: colors.onSurface,
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...Platform.select({
      web: { outlineStyle: 'none' },
      default: {},
    }),
  },
  heightFieldInputDense: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
  },
  heightFieldDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: FIELD_BORDER,
    marginVertical: 6,
  },
  heightUnitPicker: {
    width: 76,
    flexShrink: 0,
    justifyContent: 'center',
    overflow: 'visible',
  },
  heightUnitPickerDense: {
    width: 72,
  },
  fieldInputMultilineDense: {
    minHeight: 36,
    paddingTop: 6,
  },
  metricBoxSidebarDense: {
    padding: 8,
    borderRadius: 12,
  },
  metricBoxDense: {
    padding: 8,
  },
  metricLabelSidebarDense: {
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 4,
    textAlign: 'left',
    color: colors.primary,
    fontFamily: fonts.interSemi,
  },
  metricLabelDense: {
    fontSize: 11,
  },
  metricInputSidebarDense: {
    minHeight: 38,
    fontSize: 12,
    paddingHorizontal: 8,
  },
  metricInputDense: {
    minHeight: 38,
    fontSize: 12,
  },
  metricBoxSidebarCompact: {
    padding: 4,
    borderRadius: 10,
    backgroundColor: SIDEBAR_CARD_BG,
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.06)',
  },
  metricBoxSidebarCompactDense: {
    padding: 4,
    gap: 2,
  },
  metricLabelSidebarCompact: {
    fontSize: 9,
    lineHeight: 11,
    marginBottom: 2,
    textAlign: 'left',
    color: colors.primary,
    fontFamily: fonts.interSemi,
  },
  metricLabelSidebarCompactDense: {
    fontSize: 9,
    lineHeight: 11,
    marginBottom: 2,
  },
  metricInputSidebarCompact: {
    minHeight: 30,
    fontSize: 11,
    paddingHorizontal: 4,
    textAlign: 'center',
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: 'rgba(87, 0, 0, 0.1)',
    borderWidth: 1,
    fontFamily: fonts.interSemi,
  },
  metricInputSidebarCompactDense: {
    minHeight: 30,
    fontSize: 11,
  },
  metricBoxFamilyCompact: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: SIDEBAR_CARD_BG,
    borderWidth: 1,
    borderColor: 'rgba(87, 0, 0, 0.06)',
  },
  metricBoxFamilyCompactDense: {
    padding: 6,
  },
  metricLabelFamilyCompact: {
    fontSize: 10,
    lineHeight: 12,
    marginBottom: 3,
    textAlign: 'left',
    color: colors.primary,
    fontFamily: fonts.interSemi,
  },
  metricLabelFamilyCompactDense: {
    fontSize: 10,
    lineHeight: 12,
    marginBottom: 3,
  },
  metricInputFamilyCompact: {
    minHeight: 34,
    fontSize: 11,
    paddingHorizontal: 6,
    textAlign: 'center',
    borderRadius: 8,
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: 'rgba(87, 0, 0, 0.1)',
    borderWidth: 1,
    fontFamily: fonts.interSemi,
  },
  metricInputFamilyCompactDense: {
    minHeight: 34,
    fontSize: 11,
  },
  metricInputRegistrationDense: {
    minWidth: 64,
    fontSize: 10,
  },
  chartsRowSide: {
    gap: 8,
    marginTop: 4,
  },
  dasaLabelDense: {
    fontSize: 10,
    lineHeight: 13,
  },
  dasaInputSmallDense: {
    width: 48,
    minHeight: 32,
    paddingVertical: 5,
    fontSize: 12,
    lineHeight: 16,
  },
  detailGridTitleDense: {
    fontSize: 11,
  },
  scrollContentDense: {
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 72,
  },
  scrollContentReviewNative: {
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 220,
  },
  scrollContentFamilyStep: {
    flexGrow: 1,
    paddingTop: 2,
    paddingBottom: 76,
  },
  scrollFamilyStep: {
    flex: 1,
  },
  sheetCardFamilyStep: {
    flex: 1,
  },
  actionButtonPrimaryText: {
    color: colors.onPrimary,
    fontFamily: fonts.interSemi,
    fontSize: 11,
    lineHeight: 14,
    flexShrink: 1,
  },
  actionButtonPrimaryTextCompact: {
    fontSize: 14,
  },
  occupationFieldsWrap: {
    gap: 8,
    overflow: 'visible',
    zIndex: 1,
  },
  narrowFieldInput: {
    flex: 1,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
    minHeight: 30,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 12,
    ...Platform.select({
      web: { boxShadow: 'none', outlineStyle: 'none' },
      default: {
        shadowOpacity: 0,
        elevation: 0,
      },
    }),
  },
  propertyFieldTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6,
  },
  propertyFieldValue: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.interMedium,
  },
  propertyFieldPlaceholder: {
    flex: 1,
    color: PLACEHOLDER,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fonts.inter,
  },
  bottomSheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 0, 0, 0.42)',
  },
  bottomSheetCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    maxHeight: '82%',
    ...fieldShadow,
  },
  bottomSheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(87, 0, 0, 0.18)',
    marginBottom: spacing.sm,
  },
  bottomSheetTitle: {
    color: colors.primary,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: fonts.playfairSemi,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  bottomSheetScroll: {
    maxHeight: 420,
  },
  bottomSheetScrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  bottomSheetActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  bottomSheetCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    backgroundColor: colors.surfaceContainerLowest,
  },
  bottomSheetCancelText: {
    color: colors.onSurfaceVariant,
    fontSize: 14,
    fontFamily: fonts.interSemi,
  },
  bottomSheetSaveBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  bottomSheetSaveText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontFamily: fonts.interSemi,
  },
  propertySheetError: {
    color: colors.error,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.inter,
    textAlign: 'center',
  },
});
