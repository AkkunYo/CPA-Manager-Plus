/**
 * Repository that publishes this panel build. Release links, the header
 * GitHub link and the external update check all follow it, so a fork only
 * changes this value to stop pointing users at another repository's builds.
 */
export const MANAGER_REPOSITORY = 'AkkunYo/CPA-Manager-Plus';

export const MANAGER_REPOSITORY_URL = `https://github.com/${MANAGER_REPOSITORY}`;

export const MANAGER_LATEST_RELEASE_API_URL = `https://api.github.com/repos/${MANAGER_REPOSITORY}/releases/latest`;
