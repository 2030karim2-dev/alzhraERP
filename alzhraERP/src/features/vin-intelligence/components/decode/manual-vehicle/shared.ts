/** يضيّق قيمة نصية قابلة للفراغ إلى نص non-empty (مكافئ لصدق القيمة في الشيفرة الأصلية). */
export function hasValue(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}
