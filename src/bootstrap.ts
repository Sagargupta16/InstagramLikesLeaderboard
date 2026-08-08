import { INSTAGRAM_HOSTNAME } from './constants/constants';
import { getInstagramOwnerId } from './utils/utils';

async function bootstrap(): Promise<void> {
    if (location.hostname !== INSTAGRAM_HOSTNAME) {
        alert('Run this script on Instagram (www.instagram.com).');
        return;
    }
    if (document.getElementById('ill-root')) {
        alert('Instagram Likes Leaderboard is already running in this tab.');
        return;
    }

    const ownerId = getInstagramOwnerId();
    if (!ownerId) {
        alert('Sign in to Instagram before running Instagram Likes Leaderboard.');
        return;
    }

    const { mountApp } = await import(/* webpackMode: "eager" */ './main');
    mountApp(ownerId);
}

void bootstrap();
