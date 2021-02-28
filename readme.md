## Movie CLI

Find movies from your CLI.

## Usage

The project requires node.js, so be sure you have that installed.

On initial download, install the NPM packages (`npm install`) and build the source (`npm run build`). The project will attempt to use VLC, then Safari, and then a regular `open`.

After that you can run the project with the arguments. `node dist/ 'the last airbender' 1 1`. That's `node dist/ 'name of TV show or movie' season episode`.

I set an alias myself. `alias watch='node /path/to/project/dist/'`. That way I can do `watch 'the last airbender' 1 1` and that'll be that.