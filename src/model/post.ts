import { PageInfo } from './user';

export interface PostNode {
    readonly id: string;
    readonly shortcode: string;
    readonly edge_media_preview_like: { readonly count: number };
    readonly edge_media_to_caption: {
        readonly edges: ReadonlyArray<{ readonly node: { readonly text: string } }>;
    };
    readonly thumbnail_src: string;
    readonly taken_at_timestamp: number;
}

export interface TimelineMediaResponse {
    readonly count: number;
    readonly page_info: PageInfo;
    readonly edges: ReadonlyArray<{ readonly node: PostNode }>;
}
