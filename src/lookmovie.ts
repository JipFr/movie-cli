// There's no error handling
// I know, and I'm sorry.... Probbaly :D

import fetch from "node-fetch";

// ! Types
interface BaseConfig {
	/** The website's slug. Formatted as `1839578-person-of-interest-2011` */
	slug: string;
	/** Type of request */
	type: "tv" | "movie";
}
interface TvConfig extends BaseConfig {
	/** Type of request */
	type: "tv";
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
	// base: "https://hidden-inlet-27205.herokuapp.com/https://lookmovie.io",
	base: "https://lookmovie.io",
};

// This is different per episode (or movie if I ever add that)
const personOfInterestConfig: Config = {
	slug: "1839578-person-of-interest-2011", // From the URL... obviously
	episodeId: "17359", // Shown in URL and episode list
	type: "tv",
};
const xmenConfig: Config = {
	slug: "x-men-apocalypse-2016", // From the URL... obviously
	movieId: "14358",
	type: "movie",
};

// ! Methods / functions
/**
 * Get URL / data for thing
 * Right now this method only works with TV shows afaik
 */
async function getVideoUrl(config: Config): Promise<string> {
	// Person of Interest:
	// https://lookmovie.io/manifests/shows/json/mbQFYTR499c9vfDmAwOFrg/1613868343/17359/master.m3u8

	// X-men: Apocalypse
	// https://lookmovie.io/manifests/movies/json/14358/1613868860/j5_imzkY3WkNR21KByjv0g/master.m3u8

	// Tv show episode URL generation
	const accessToken = await getAccessToken(config);
	const now = Math.floor(Date.now() / 1e3);

	let url: string | null = null;
	if (config.type === "tv") {
		url = `${cfg.base}/manifests/shows/json/${accessToken}/${now}/${config.episodeId}/master.m3u8`;
	} else if (config.type === "movie") {
		url = `${cfg.base}/manifests/movies/json/${config.movieId}/${now}/${accessToken}/master.m3u8`;
	}

	if (url) {
		const videoOpts = await fetch(url).then((d) => d.json());

		// Find video URL and return it (with a check for a full url if needed)
		const opts = ["1080p", "1080", "720p", "720", "480p", "480", "auto"]

		let videoUrl = "";
		for(let res of opts) {
			if(videoOpts[res] && !videoOpts[res].includes('dummy') && !videoOpts[res].includes('earth-1984') && !videoUrl) {
				videoUrl = videoOpts[res]
			}
		}

		console.log(videoOpts)

		return videoUrl.startsWith("/") ? `${cfg.base}${videoUrl}` : videoUrl;
	}

	return "Invalid type.";
}

async function getAccessToken(config: Config): Promise<string> {
	let url: string = "";
	if (config.type === "tv") {
		// 'mbQFYTR499c9vfDmAwOFrg' // Retrieved from: https://lookmovie.io/api/v1/security/show-access?slug=1839578-person-of-interest-2011&token=&step=2
		url = `${cfg.base}/api/v1/security/show-access?slug=${config.slug}&token=&step=2`;
	} else if (config.type === "movie") {
		// https://lookmovie.io/api/v1/security/movie-access?id_movie=14358&token=1&sk=&step=1
		url = `${cfg.base}/api/v1/security/movie-access?id_movie=${config.movieId}&token=1&sk=&step=1`;
	}
	const data = await fetch(url).then((d) => d.json());

	const token = data?.data?.accessToken;
	if (token) return token;
	
	return "Invalid type provided in config";
}

// console.log(await getVideoUrl(personOfInterestConfig));
// console.log(await getVideoUrl(xmenConfig));

export default getVideoUrl;
