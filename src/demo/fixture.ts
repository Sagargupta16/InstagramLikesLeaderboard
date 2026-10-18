// Deterministic sample account for the demo page. Every value is generated from a
// fixed seed, so screenshots and tests see the same data on every run.

export interface DemoAccount {
    readonly pk: string;
    readonly username: string;
    readonly full_name: string;
    readonly profile_pic_url: string;
    readonly is_verified: boolean;
    readonly is_private: boolean;
    readonly has_anonymous_profile_picture: boolean;
}

export interface DemoPost {
    readonly pk: string;
    readonly like_count: number;
    readonly caption: string;
    readonly likerIds: readonly string[];
}

export interface DemoFixture {
    readonly ownerId: string;
    readonly username: string;
    readonly accounts: Readonly<Record<string, DemoAccount>>;
    readonly posts: readonly DemoPost[];
    readonly followingIds: readonly string[];
    readonly followerIds: readonly string[];
}

export const DEMO_OWNER_ID = '1000000001';
export const DEMO_USERNAME = 'demo.studio';

const ACCOUNT_COUNT = 220;
const POST_COUNT = 36;
const SEED = 20261018;

const FIRST_NAMES = [
    'Aarav', 'Maya', 'Noah', 'Isha', 'Leo', 'Zara', 'Kabir', 'Ava', 'Rohan', 'Mia', 'Arjun', 'Lena',
    'Vikram', 'Nora', 'Dev', 'Ira', 'Sam', 'Tara', 'Neel', 'Ella', 'Rhea', 'Omar', 'Anya', 'Kai',
    'Priya', 'Luca', 'Sana', 'Eli', 'Diya', 'Finn',
];
const LAST_NAMES = [
    'Sharma', 'Chen', 'Patel', 'Rossi', 'Khan', 'Silva', 'Mehta', 'Okafor', 'Iyer', 'Novak',
    'Reddy', 'Larsen', 'Gupta', 'Moreau', 'Nair', 'Kim',
];
const HANDLE_WORDS = [
    'frames', 'trails', 'sketches', 'brews', 'lens', 'notes', 'pixels', 'travels', 'plates', 'studio',
    'runs', 'reads', 'beats', 'films', 'greens', 'crafts', 'skies', 'loops', 'shots', 'journal',
];
const CAPTIONS = [
    'Golden hour on the terrace',
    'First try at latte art',
    'Monsoon walk through the old city',
    'Sunday sketchbook dump',
    'New lens, same street',
    'Weekend trek, 14 km and worth it',
    'Recipe in the comments',
    'Studio corner after the rearrange',
    '',
    'Throwback to the coast',
    'Night market lights',
    'Desk setup, version four',
];
const AVATAR_COLORS = ['#5eead4', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#4ade80', '#fb923c', '#f87171'];

// mulberry32: small, fast, deterministic PRNG.
function createRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function pick<T>(items: readonly T[], random: () => number): T {
    return items[Math.floor(random() * items.length)] as T;
}

function svgDataUri(svg: string): string {
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function avatar(initials: string, color: string): string {
    return svgDataUri(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
        + `<rect width="64" height="64" fill="${color}"/>`
        + '<text x="32" y="41" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="24" '
        + `font-weight="700" text-anchor="middle" fill="#111113">${initials}</text></svg>`,
    );
}

const ANONYMOUS_AVATAR = svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#3a3a42"/>'
    + '<circle cx="32" cy="25" r="11" fill="#7a7a85"/><path d="M12 58c2-12 10-18 20-18s18 6 20 18z" fill="#7a7a85"/></svg>',
);

function uniqueUsername(first: string, random: () => number, taken: ReadonlySet<string>): string {
    let username = `${first.toLowerCase()}.${pick(HANDLE_WORDS, random)}`;
    let suffix = 2;
    while (taken.has(username)) {
        username = `${first.toLowerCase()}.${pick(HANDLE_WORDS, random)}${suffix}`;
        suffix++;
    }
    return username;
}

export function buildDemoFixture(): DemoFixture {
    const random = createRandom(SEED);
    const accounts: Record<string, DemoAccount> = {};
    const affinity = new Map<string, number>();
    const usernames = new Set<string>();
    const followingIds: string[] = [];
    const followerIds: string[] = [];

    for (let index = 0; index < ACCOUNT_COUNT; index++) {
        const pk = String(2_000_000_001 + index);
        const first = pick(FIRST_NAMES, random);
        const last = pick(LAST_NAMES, random);
        const username = uniqueUsername(first, random, usernames);
        usernames.add(username);

        const anonymous = random() < 0.05;
        accounts[pk] = {
            pk,
            username,
            full_name: random() < 0.1 ? '' : `${first} ${last}`,
            profile_pic_url: anonymous
                ? ANONYMOUS_AVATAR
                : avatar(`${first[0]}${last[0]}`, pick(AVATAR_COLORS, random)),
            is_verified: random() < 0.04,
            is_private: random() < 0.3,
            has_anonymous_profile_picture: anonymous,
        };
        // A few close friends like nearly everything; most accounts like a little.
        affinity.set(pk, Math.min(0.95, random() ** 2.4 + (index < 6 ? 0.55 : 0)));

        const follows = random() < 0.62;
        if (follows) {
            followingIds.push(pk);
        }
        if (random() < (follows ? 0.82 : 0.38)) {
            followerIds.push(pk);
        }
    }

    const followingSet = new Set(followingIds);
    const posts: DemoPost[] = [];
    for (let index = 0; index < POST_COUNT; index++) {
        const popularity = 0.6 + random() * 0.8;
        const likerIds = Object.keys(accounts).filter(pk => {
            const reach = followingSet.has(pk) ? 1 : 0.65;
            return random() < Math.min(0.97, (affinity.get(pk) ?? 0) * reach * popularity);
        });
        posts.push({
            pk: String(3_400_000_000_000_000_000n + BigInt(POST_COUNT - index)),
            // The displayed count includes likes the liker endpoint does not return.
            like_count: likerIds.length + Math.floor(random() * 30),
            caption: CAPTIONS[index % CAPTIONS.length] ?? '',
            likerIds,
        });
    }

    return {
        ownerId: DEMO_OWNER_ID,
        username: DEMO_USERNAME,
        accounts,
        posts,
        followingIds,
        followerIds,
    };
}
