vatic.js
=========

[vatic](http://carlvondrick.com/vatic/) is an interactive video annotation tool developed by Carl Vondrick et. al. at UC Irvine in 2011. It has had a number of improvements since then, including this JavaScript version originally developed by @dbolkensteyns. See the original `vatic.js` in action at [dbolkensteyns/vactic.js](https://dbolkensteyn.github.io/vatic.js/).

This JavaScript version has been altered to fit into a ROS workflow where a tool has already been used to extract frames from a rosbag. Thus, the only option available when using this version is to load a zip of JPG images.

## Installation and Running the Server ##

The simplest way to run `vatic.js` is to clone and use a simple HTTP server as follows:

```bash
$ git clone https://github.com/plusk01/vatic.js
$ cd vatic.js
$ python -m SimpleHTTPServer
```

If you are simply using `vatic.js` for annotation, this is sufficient. If you would like to develop the code, keep reading.

#### Live Reload Development Server ####

When developing web applications, it is nice to have the webpage reload automagically when you save. This can be done with the `live-server` `npm` (NodeJS) package.

1. Get NodeJS using `nvm` (node version manager).

    ```bash
    curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.2/install.sh | bash
    ```

1. Follow the prompt at the end of the `nvm` to add two lines to your `~/.bashrc`:

    ```bash
    # NVM and NodeJS
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
    ```

1. Install the latest version of NodeJS LTS (tested on `v6.11.2`):

    ```bash
    $ nvm install --lts
    ```

1. Install `live-server` using `npm` (NodeJS Package Manager):

    ```bash
    $ npm install -g live-server
    ```

1. Navigate to the `vatic.js` directory and run:

    ```bash
    $ cd ~/vatic.js
    $ live-reload
    ```

    A Chrome browser should automatically open and each time you `touch` a file (i.e., save) in the `live-server` directory, the browser will automatically refresh!