/**
 * Unified UAS7 / Daily UAS / AAS7 Severity Scale — DrMayDay Clinical Standard
 * Strict 1:1 mapping: 1 score band = 1 semantic color (WCAG AA >= 4.5:1) + 1 label.
 *
 * Bands (Weekly UAS7, 0–42):
 * - 0      : Sạch bệnh      (#0F766E on #CCFBF1, contrast 5.47:1 on white)
 * - 1–6    : Kiểm soát tốt  (#15803D on #DCFCE7, contrast 5.13:1 on white)
 * - 7–15   : Nhẹ            (#0369A1 on #E0F2FE, contrast 5.93:1 on white)
 * - 16–27  : Trung bình     (#B45309 on #FEF3C7, contrast 5.02:1 on white)
 * - 28–42  : Nặng           (#DC2626 on #FEE2E2, contrast 4.83:1 on white)
 */

export const UAS7_BANDS = [
  {
    key: 'urticaria_free',
    min: 0,
    max: 0,
    rangeLabel: '0',
    label: 'Sạch bệnh',
    shortLabel: 'Sạch bệnh',
    fg: '#0F766E',
    bg: '#CCFBF1',
    border: '#5EEAD4',
    tagClass: 'base-tag-teal',
    barColor: '#0F766E',
  },
  {
    key: 'well_controlled',
    min: 1,
    max: 6,
    rangeLabel: '1–6',
    label: 'Kiểm soát tốt',
    shortLabel: 'Kiểm soát tốt',
    fg: '#15803D',
    bg: '#DCFCE7',
    border: '#86EFAC',
    tagClass: 'base-tag-positive',
    barColor: '#15803D',
  },
  {
    key: 'mild',
    min: 7,
    max: 15,
    rangeLabel: '7–15',
    label: 'Nhẹ',
    shortLabel: 'Nhẹ',
    fg: '#0369A1',
    bg: '#E0F2FE',
    border: '#7DD3FC',
    tagClass: 'base-tag-info',
    barColor: '#0369A1',
  },
  {
    key: 'moderate',
    min: 16,
    max: 27,
    rangeLabel: '16–27',
    label: 'Trung bình',
    shortLabel: 'Trung bình',
    fg: '#B45309',
    bg: '#FEF3C7',
    border: '#FCD34D',
    tagClass: 'base-tag-warning',
    barColor: '#B45309',
  },
  {
    key: 'severe',
    min: 28,
    max: 42,
    rangeLabel: '28–42',
    label: 'Nặng',
    shortLabel: 'Nặng',
    fg: '#DC2626',
    bg: '#FEE2E2',
    border: '#FCA5A5',
    tagClass: 'base-tag-negative',
    barColor: '#DC2626',
  },
];

export function getUas7Band(score) {
  if (score === null || score === undefined || Number.isNaN(Number(score))) {
    return {
      key: 'unrecorded',
      rangeLabel: '—',
      label: 'Chưa ghi nhận',
      shortLabel: 'Chưa ghi',
      fg: '#475569',
      bg: '#F1F5F9',
      border: '#CBD5E1',
      tagClass: 'base-tag-neutral',
      barColor: '#94A3B8',
    };
  }
  const n = Math.max(0, Math.min(42, Number(score)));
  if (n === 0) return UAS7_BANDS[0];
  if (n <= 6) return UAS7_BANDS[1];
  if (n <= 15) return UAS7_BANDS[2];
  if (n <= 27) return UAS7_BANDS[3];
  return UAS7_BANDS[4];
}

/**
 * Daily UAS (0–6) mapped proportionally to the same 5-band palette.
 */
export function getDailyUasBand(daily) {
  if (daily === null || daily === undefined || Number.isNaN(Number(daily))) {
    return getUas7Band(null);
  }
  const n = Math.max(0, Math.min(6, Number(daily)));
  if (n === 0) return UAS7_BANDS[0];
  if (n === 1) return UAS7_BANDS[1];
  if (n === 2) return UAS7_BANDS[2];
  if (n <= 4) return UAS7_BANDS[3];
  return UAS7_BANDS[4];
}
