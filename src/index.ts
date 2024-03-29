// Imports
import fetch from "node-fetch";
import Fuse from "fuse.js";
import * as json5 from "json5";
import getVideoUrl from "./lookmovie";
import { exec } from "child_process";
import prompt from "prompts";
import { match } from "assert";

// Process args
const [searchTerm, season, episode] = process.argv.slice(2);
let commandIndex = 0;

async function main() {
	console.log(searchTerm);
	if (season && !episode) {
		console.error("Missing episode");
		return;
	}

	// Do search, merge TV and movie results
	const movieSearchRes = await fetch(
		`https://lookmovie2.to/api/v1/movies/do-search/?q=${encodeURIComponent(
			searchTerm
		)}`
	).then((d) => d.json());
	const showSearchRes = await fetch(
		`https://lookmovie2.to/api/v1/shows/do-search/?q=${encodeURIComponent(
			searchTerm
		)}`
	).then((d) => d.json());

	// Map results to array
	let results = [
		...movieSearchRes.result.map((v) => ({ ...v, type: "movie" })),
		...showSearchRes.result.map((v) => ({ ...v, type: "show" })),
	];

	// Remove movies if the user defined a season and episode
	if (season && episode) {
		results = results.filter((v) => v.type === "show");
	}

	console.log(results);

	// @ts-ignore
	const fuse = new Fuse(results, {
		threshold: 0.3,
		distance: 200,
		keys: ["title"],
	});
	const matchedResults = fuse
		.search(searchTerm.toString())
		.map((result) => result.item);

	// Now findthe first item and do the thing
	let toShow;
	if (matchedResults.length > 1) {
		const response = await prompt([
			{
				type: "select",
				name: "id",
				message: "Pick a movie or show",
				choices: matchedResults.map((v, i) => {
					return {
						title: v.title,
						value: i,
					};
				}),
			},
		]);
		toShow = matchedResults[response.id];
	} else {
		toShow = matchedResults[0];
	}

	if (!toShow) {
		console.error("Unable to find that... Sorry!");
		return;
	}

	if (toShow.type === "show" && (!season || !episode)) {
		console.error(
			"For this TV show, please provide a season and episode to watch."
		);
		return;
	}

	console.log(`Scraping the ${toShow.type} "${toShow.title}"`);

	// ! Now we get the ID and stuff we need
	const url = `https://www.lookmovie2.to/${toShow.type}s/play/${toShow.slug}`;
	const pageReq = await fetch(url).then((d) => d.text());

	// Extract and parse JSON
	let scriptJson =
		"{" +
		pageReq
			.slice(pageReq.indexOf(`${toShow.type}_storage`))
			.split("};")[0]
			.split("= {")[1]
			.trim() +
		"}";
	const data = json5.parse(scriptJson);

	// Find the relevant id
	let id = null;
	let relevantEpisode;
	if (toShow.type === "movie") {
		id = data.id_movie;
	} else if (toShow.type === "show") {
		const episodeObj = data.seasons.find((v) => {
			return v.season == season && v.episode == episode;
		});
		if (episodeObj) {
			console.log(
				`Finding streams for ${toShow.title} ${season}x${episode}: ${episodeObj.title}`
			);
			id = episodeObj.id_episode;
			relevantEpisode = episodeObj;
		}
	}

	// Check ID
	if (id === null) {
		console.error(`Not found: S${season} E${episode}`);
		return;
	}

	// Generate object to send over to scraper
	let reqObj = null;
	if (toShow.type === "show") {
		reqObj = {
			slug: toShow.slug,
			episodeId: id,
			type: "tv",
			...data,
		};
	} else if (toShow.type === "movie") {
		reqObj = {
			slug: toShow.slug,
			movieId: id,
			type: "movie",
			...data,
		};
	}

	if (!reqObj) {
		console.error("Invalid type");
		return;
	}

	const videoUrl = await getVideoUrl(reqObj);
	attemptOpen(videoUrl, relevantEpisode, data);
}

function attemptOpen(videoUrl: string, episode, data) {
	// Bit of a hack, but oh well.
	const maxTimeout = 5e3;
	const now = Date.now();

	// Define shell commands to attempt
	const fullUrl = `https://xenodochial-mestorf-a8f181.netlify.app/?https://hidden-inlet-27205.herokuapp.com/${videoUrl}`;
	const title = `${data.title}${episode?.title ? `: ${episode.title}` : ""} (${
		data.year
	})`;
	const commands = [
		`vlc ${videoUrl} --meta-title=${title}`,
		`/Applications/VLC.app/Contents/MacOS/VLC ${videoUrl} --meta-title="${title}"`,
		`"C:\\Program Files\\VideoLAN\\VLC\\vlc.exe" ${videoUrl} --meta-title="${title}"`,
		`/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --app=${fullUrl}`,
		`open ${fullUrl}`,
		`open -a Safari ${videoUrl}`,
		`open ${videoUrl}`,
	];

	// Find relevant one and execute it
	const command = commands[commandIndex];
	if (command) {
		exec(command, (err, _stdout, stderr) => {
			const diff = Date.now() - now;
			if ((err || stderr) && diff < maxTimeout) {
				// If it has failed within the timer, attempt next
				commandIndex++;
				console.log(
					`Command ${commandIndex} failed after`,
					diff,
					"ms, trying next"
				);
				attemptOpen(videoUrl, episode, data);
			} else {
				console.log("Ended");
			}
		});
	} else {
		console.error("Looks like everything failed, weird.");
	}
}

main();
