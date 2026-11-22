// Adult runs live at /, youth (HS/MS) runs at /youth — separate runs, players and settings
export const DIVISIONS = ['adult', 'youth']

export const DIVISION_LABELS = { adult: 'Adult', youth: 'Youth · HS/MS' }

export function basePath(division) {
  return division === 'youth' ? '/youth' : ''
}
