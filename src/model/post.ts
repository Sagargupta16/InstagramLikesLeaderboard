export type PostScope = 'all_posts' | 'recent_limit';

export interface PostNode {
    readonly id: string;
    readonly edge_media_preview_like: { readonly count: number };
    readonly edge_media_to_caption: {
        readonly edges: ReadonlyArray<{ readonly node: { readonly text: string } }>;
    };
}
