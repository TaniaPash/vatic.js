### Forked from https://github.com/plusk01/vatic.js

vatic.js
=========

[vatic](http://carlvondrick.com/vatic/) is an interactive video annotation tool developed by Carl Vondrick et. al. at UC Irvine in 2011. It has had a number of improvements since then, including this JavaScript version originally developed by **@dbolkensteyns**. See `vatic.js` in action [here](https://plusk01.github.io/vatic.js/).

This JavaScript version has been altered to fit into a ROS workflow where a tool has already been used to extract frames from a rosbag. Thus, the only option available when using this version is to load a zip of JPG images. However, this tool does not **require** ROS at all -- it can be used simply as an annotator of extracted frames. You could even use the [original](https://github.com/dbolkensteyn/vatic.js) vatic.js to download a zipped archive from a video file (or some other script/tool) and then continue using this version of the tool to perform the annotation.

**Note**: This tool works best with images that have fewer number of objects to be identified/tracked in a given frame (i.e., <10).

## Purpose ##

The purpose of this web tool is to easily annotate video that is used in a research setting while developing new algorithms for target tracking, object recognition, etc. The XML annotation file can be used to compare algorithm outputs with a human-decided "ground truth".

## Instructions and Workflow ##

Because this tool is expected to be used in a ROS environment, it is required to upload a zipped archive of already extracted frames. This image frames can be of any size (as long as they are all the same) and must be named as `<frame_number>.jpg` using the JPG image codec. Note that frame numbers are not to be padded with zeros.

In order to synchronize each annotated frame with the output of a ROS node, it is necessary to provide a `timestamp.xml` file in the zipped archive of image frames. This file has the following structure:

```xml
<?xml version="1.0" encoding="utf-8"?>
<extractor>
  <info>
    <bag>/home/plusk01/Documents/bags/nasa/run3.bag</bag>
    <topic>/camera/image_raw/compressed</topic>
  </info>
  <timestamps>
    <frame>
      <num>0</num>
      <t>1502288464.241372</t>
    </frame>
    <!-- ... -->
  </timestamps>
</extractor>
```

Where the `<num>` element contains the frame number and `<t>` is the timestamp from the ROS `std_msgs::Header/stamp` field. This purpose of this is for better synchronization of images during a ROS pub/sub pipeline. As the image message propagates across nodes, some frames will be dropped and the frame number (`Header/seq`) will become out of sync with the original frames in the zipped archive. However, the timestamp is correct across all of the ROS image pipeline -- therefore, you can use that to synchronize ground truth with algorithm output. The timestamp will be added to the annotation file as shown below.

After you have annotated your video frames, the output XML file will look like:

```xml
<?xml version="1.0" encoding="utf-8"?>
<annotation>
  <folder>not available</folder>
  <filename>frames_lg</filename>
  <source>
    <type>video</type>
    <sourceImage>video frames</sourceImage>
    <sourceAnnotation>vatic.js</sourceAnnotation>
  </source>
  <object>
    <name>Person</name>
    <moving>true</moving>
    <action/>
    <verified>0</verified>
    <id>1</id>
    <createdFrame>0</createdFrame>
    <startFrame>0</startFrame>
    <endFrame>11477</endFrame>
    <polygon>
      <frame>0</frame>                          <!-- frame number  -->
      <t>123123.666</t>                         <!-- ROS timestamp -->
      <pt><x>597</x><y>349</y><l>1</l></pt>     <!-- top-left corner -->
      <pt><x>597</x><y>378</y><l>1</l></pt>     <!-- bottom-left corner -->
      <pt><x>629</x><y>378</y><l>1</l></pt>     <!-- bottom-right corner -->
      <pt><x>629</x><y>349</y><l>1</l></pt>     <!-- top-right corner -->
    </polygon>
    <polygon>
      <frame>1</frame>
      <t>0</t>
      <pt><x>595</x><y>349</y><l>0</l></pt>     <!-- <l>0</l> denotes that this -->
      <pt><x>595</x><y>378</y><l>0</l></pt>     <!-- frame only used optical    -->
      <pt><x>627</x><y>378</y><l>0</l></pt>     <!-- flow for tracking with no  -->
      <pt><x>627</x><y>349</y><l>0</l></pt>     <!-- operator involvement       -->
    </polygon>
  </object>
</annotation>
```

## Installation and Running a Local Server ##

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
