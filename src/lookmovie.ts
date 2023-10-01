// There's no error handling
// I know, and I'm sorry.... Probbaly :D

import fetch from "node-fetch";

// ! Types
interface BaseConfig {
	/** The website's slug. Formatted as `1839578-person-of-interest-2011` */
	slug: string;
	/** Type of request */
	type: "show" | "movie";
	/** Hash */
	hash: string;
	/** Hash expiry */
	expires: number;
}
interface TvConfig extends BaseConfig {
	/** Type of request */
	type: "show";
	/** The episode ID for a TV show. Given in search and URL */
	episodeId: string;
}
interface MovieConfig extends BaseConfig {
	/** Type of request */
	type: "movie";
	/** Movie's id */
	movieId: string;
}
type Config = MovieConfig | TvConfig;

// ! Configuration
const cfg = {
	// base: "https://hidden-inlet-27205.herokuapp.com/https://lookmovie2.to",
	base: "https://lookmovie2.to",
};

// ! Methods / functions
/**
 * Get URL / data for thing
 * Right now this method only works with TV shows afaik
 */
async function getVideoUrl(config: Config): Promise<string> {
	// Get sources
	const data = await getVideoSources(config);
	const videoSources = data.streams;

	// Find video URL and return it (with a check for a full url if needed)
	const opts = ["1080p", "1080", "720p", "720", "480p", "480", "auto"];

	let videoUrl = "";
	for (let res of opts) {
		if (videoSources[res] && !videoUrl) {
			videoUrl = videoSources[res];
		}
	}

	return videoUrl.startsWith("/") ? `${cfg.base}${videoUrl}` : videoUrl;
}

async function getVideoSources(config: Config): Promise<any> {
	// Fetch video sources
	let url: string = "";
	if (config.type === "show") {
		url = `${cfg.base}/api/v1/security/episode-access?id_episode=${config.episodeId}&hash=${config.hash}&expires=${config.expires}`;
	} else if (config.type === "movie") {
		url = `${cfg.base}/api/v1/security/movie-access?id_movie=${config.movieId}&hash=${config.hash}&expires=${config.expires}`;
	}
	const data = await fetch(url).then((d) => d.json());
	return data;
}

export default getVideoUrl;
