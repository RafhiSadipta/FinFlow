/**
 * Format angka ke mata uang Rupiah (contoh: Rp 125.000)
 */
export function formatRupiah(amount: number, withPrefix = true): string {
  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));

  if (!withPrefix) return formatted;
  return `${amount < 0 ? '-Rp ' : 'Rp '}${formatted}`;
}

/**
 * Format tanggal ramah pengguna (contoh: "Senin, 27 Sep 2026" atau "27 Sep")
 */
export function formatDate(dateString: string, formatType: 'full' | 'short' | 'time' = 'short'): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    if (formatType === 'time') {
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }

    if (formatType === 'full') {
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }

    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Konversi angka integer ke ejaan terbilang bahasa Indonesia
 */
export function numberToWordsID(nominal: number): string {
  if (nominal === 0) return 'Nol rupiah';
  if (nominal < 0) return `Minus ${numberToWordsID(Math.abs(nominal))}`;

  const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

  function terbilangHelper(n: number): string {
    if (n < 12) {
      return satuan[n];
    } else if (n < 20) {
      return `${satuan[n - 10]} belas`;
    } else if (n < 100) {
      const sisa = n % 10;
      return `${satuan[Math.floor(n / 10)]} puluh ${sisa > 0 ? satuan[sisa] : ''}`.trim();
    } else if (n < 200) {
      return `seratus ${terbilangHelper(n - 100)}`.trim();
    } else if (n < 1000) {
      return `${satuan[Math.floor(n / 100)]} ratus ${terbilangHelper(n % 100)}`.trim();
    } else if (n < 2000) {
      return `seribu ${terbilangHelper(n - 1000)}`.trim();
    } else if (n < 1000000) {
      return `${terbilangHelper(Math.floor(n / 1000))} ribu ${terbilangHelper(n % 1000)}`.trim();
    } else if (n < 1000000000) {
      return `${terbilangHelper(Math.floor(n / 1000000))} juta ${terbilangHelper(n % 1000000)}`.trim();
    } else if (n < 1000000000000) {
      return `${terbilangHelper(Math.floor(n / 1000000000))} milyar ${terbilangHelper(n % 1000000000)}`.trim();
    } else if (n < 1000000000000000) {
      return `${terbilangHelper(Math.floor(n / 1000000000000))} triliun ${terbilangHelper(n % 1000000000000)}`.trim();
    }
    return '';
  }

  const hasil = terbilangHelper(Math.floor(nominal)).trim();
  if (!hasil) return '';
  return `${hasil.charAt(0).toUpperCase() + hasil.slice(1)} rupiah`;
}
