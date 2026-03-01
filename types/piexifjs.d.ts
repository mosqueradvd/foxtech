// Type declarations for modules without @types packages
declare module 'piexifjs' {
    interface ExifDict {
        [key: string]: any;
    }

    const ImageIFD: Record<string, number>;
    const ExifIFD: Record<string, number>;
    const GPSIFD: Record<string, number>;

    function load(jpegData: string): ExifDict;
    function dump(exifObj: ExifDict): string;
    function insert(exifStr: string, jpegData: string): string;
    function remove(jpegData: string): string;
}
