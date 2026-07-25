declare module "jpeg-js" {
  export interface RawImageData {
    data: Buffer | Uint8Array;
    width: number;
    height: number;
  }

  export interface EncodedImage {
    data: Buffer;
    width: number;
    height: number;
  }

  export function encode(
    imgData: RawImageData,
    quality?: number,
  ): EncodedImage;

  export function decode(
    jpegData: Buffer | Uint8Array,
    opts?: { useTArray?: boolean },
  ): RawImageData & { data: Buffer | Uint8Array };
}
