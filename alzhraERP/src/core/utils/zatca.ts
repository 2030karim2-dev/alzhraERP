
/**
 * ZATCA E-Invoicing QR Code Generator
 * Implements the TLV (Type-Length-Value) encoding standard required by ZATCA (Saudi Arabia).
 */

const getTLV = (tag: number, value: string): Uint8Array => {
  const textEncoder = new TextEncoder();
  const valueBytes = textEncoder.encode(value);
  const length = valueBytes.length;
  
  // Tag (1 byte)
  const tagByte = new Uint8Array([tag]);
  
  // Length (1 byte)
  const lengthByte = new Uint8Array([length]);
  
  // Combine: Tag + Length + Value
  const combined = new Uint8Array(tagByte.length + lengthByte.length + valueBytes.length);
  combined.set(tagByte, 0);
  combined.set(lengthByte, tagByte.length);
  combined.set(valueBytes, tagByte.length + lengthByte.length);
  
  return combined;
};

export const generateZatcaBase64 = (
  sellerName: string,
  vatNumber: string,
  timestamp: string,
  totalAmount: string,
  vatAmount: string
): string => {
  const tags = [
    getTLV(1, sellerName),
    getTLV(2, vatNumber),
    getTLV(3, timestamp),
    getTLV(4, totalAmount),
    getTLV(5, vatAmount)
  ];

  // Calculate total length
  const totalLength = tags.reduce((sum, tag) => sum + tag.length, 0);
  const concatenatedBuffer = new Uint8Array(totalLength);
  
  let offset = 0;
  for (const tag of tags) {
    concatenatedBuffer.set(tag, offset);
    offset += tag.length;
  }

  // Convert Uint8Array to Base64 manually to ensure browser compatibility
  let binary = '';
  const len = concatenatedBuffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(concatenatedBuffer[i]);
  }
  
  return window.btoa(binary);
};
