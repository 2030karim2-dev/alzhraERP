/**
 * Arabic Number to Words (Tafqeet)
 * Simple and robust implementation for financial reporting
 */

const ones = ['', 'واحد', 'اثنين', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const hundreds = ['', 'مئة', 'مئتان', 'ثلاثمئة', 'أربعمئة', 'خمسمئة', 'ستمئة', 'سبعمئة', 'ثمامئة', 'تسعمئة'];

export function tafqeet(n: number, currency: string = 'ر.س'): string {
    if (n === 0) return 'صفر ' + currency;

    const absN = Math.abs(n);
    const integerPart = Math.floor(absN);
    const decimalPart = Math.round((absN - integerPart) * 100);

    let result = convertGroup(integerPart);

    if (decimalPart > 0) {
        result += ' و ' + convertGroup(decimalPart) + ' هللة';
    }

    return result + ' ' + currency;
}

function convertGroup(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) {
        const one = n % 10;
        const ten = Math.floor(n / 10);
        return (one > 0 ? ones[one] + ' و ' : '') + tens[ten];
    }
    if (n < 1000) {
        const hundred = Math.floor(n / 100);
        const rest = n % 100;
        return hundreds[hundred] + (rest > 0 ? ' و ' + convertGroup(rest) : '');
    }
    if (n < 1000000) {
        const thousand = Math.floor(n / 1000);
        const rest = n % 1000;
        let thousandText = '';
        if (thousand === 1) thousandText = 'ألف';
        else if (thousand === 2) thousandText = 'ألفان';
        else if (thousand >= 3 && thousand <= 10) thousandText = convertGroup(thousand) + ' آلاف';
        else thousandText = convertGroup(thousand) + ' ألف';

        return thousandText + (rest > 0 ? ' و ' + convertGroup(rest) : '');
    }

    const million = Math.floor(n / 1000000);
    const rest = n % 1000000;
    let millionText = '';
    if (million === 1) millionText = 'مليون';
    else if (million === 2) millionText = 'مليونان';
    else if (million >= 3 && million <= 10) millionText = convertGroup(million) + ' ملايين';
    else millionText = convertGroup(million) + ' مليون';

    return millionText + (rest > 0 ? ' و ' + convertGroup(rest) : '');
}
