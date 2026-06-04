export type LogoRasterVariant = {
    paperWidth: 58 | 80;
    pixelWidth: number;
    pixelHeight: number;
    relativePath: string;
    bytes: number;
    algorithm: 'threshold';
    threshold: number;
};

export type LogoMetadataV1 = {
    version: 1;
    logoId: string;
    logoVersion: string;
    createdAt: number;
    source: {
        originalFileName: string;
        mimeType: string;
        relativePath: string;
        sha256: string;
        pixelWidth: number;
        pixelHeight: number;
    };
    preview: {
        relativePath: string;
        pixelWidth: number;
        pixelHeight: number;
    };
    rasters: LogoRasterVariant[];
};
