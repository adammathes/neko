<pre style="font-family: menlo, courier, monospace;">
                     ██
                     ██
                     ██
 ██░████    ░████▒   ██  ▓██▒   ░████░
 ███████▓  ░██████▒  ██ ▓██▒   ░██████░
 ███  ▒██  ██▒  ▒██  ██▒██▒    ███  ███
 ██    ██  ████████  ████▓     ██░  ░██
 ██    ██  ████████  █████     ██    ██
 ██    ██  ██        ██░███    ██░  ░██
 ██    ██  ███░  ▒█  ██  ██▒   ███  ███
 ██    ██  ░███████  ██  ▒██   ░██████░
 ██    ██   ░█████▒  ██   ███   ░████░

             v0.2 manual
               7/4/2018
</pre>

<!-- markdown-toc start - Don't edit this section. Run M-x markdown-toc-generate-toc again -->

- [Neko](#neko)
    - [Features](#features)
    - [Screenshots](#screenshots)
- [Installation](#installation)
    - [Requirements](#requirements)
    - [Building](#building)
        - [Dependencies](#dependencies)
- [Configuration](#configuration)
    - [Storage](#storage)
- [Usage](#usage)
    - [Web Interface](#web-interface)
    - [Add Feed](#add-feed)
    - [Crawl Feeds](#crawl-feeds)
    - [Export](#export)
- [All Command Line Options](#all-command-line-options)
- [Configuration File](#configuration-file)
- [TODO](#todo)
- [History](#history)
    - [Early 2017](#early-2017)
    - [July 2018 -- v0.2](#july-2018----v02)
- [Feedback](#feedback)

<!-- markdown-toc end -->


# Neko

`neko` is a self-hosted, rss reader focused on simplicity and efficiency.

Backend is written in `Go` and there is a simple javascript frontend and cat ears.

*note: the cat ears are in your mind*

## Features

   * limited features (#1 feature)
   * keyboard shortcuts
      * **j** - next item
      * **k** - previous item
      * that's all you should ever need
   * automatically marks items read in an infinite stream of never-ending content (until you run out of content and it ends)
   * full text search
   * scrapes full text of pages on demand

## Screenshots

![Screenshot 1](screenshot/neko.jpg?raw=true "Screenshot 1")

![Screenshot 2](screenshot/neko2.jpg?raw=true "Screenshot 2")

# Installation

## Requirements

If you are using a binary, no dependencies!

NOTE: I haven't put up any binaries yet.
 
## Building

### Dependencies

   * [Go](https://golang.org)
   * [go-sqlite3](https://github.com/mattn/go-sqlite3)
      * [sqlite](https://sqlite.org/index.html)
      * [gcc](https://gcc.gnu.org)

    $ go get adammathes.com/neko
   
This will download `neko`, dependencies, and build them all in `$GOPATH/src/`. By default this should be something like `$HOME/go/src/`.

A `neko` binary should now be in `$GOPATH/bin/`. By default this is usually `$HOME/go/bin/`

# Configuration

Everything can handled with a few command line flags. You shouldn't need to change the defaults most of the time.

You can also set options using a configuration file [`yaml`](http://yaml.org), described at the end of this README (but you probably don't need to.)

## Storage

By default `neko` will create the file `neko.db` in the current directory for storage.

You can override the location of this database file with the `--database` command line option or `-d` short option.

    $ neko --database=/var/db/neko.db --add=http://trenchant.org/rss.xml

which is equivalent to --

    $ neko -d /var/db/neko.db --add=http://trenchant.org/rss.xml

For expert users -- this is a [SQLite](https://sqlite.org/) database and can be manipulated with standard sqlite commands --

    $ sqlite3 neko.db .schema
    
-- will print out the database schema.

# Usage

## Web Interface

You can do most of what you need to do with `neko` from the web interface, which is what `neko` does by default.

    $ neko
    
`neko` web interface should now be available at `127.0.0.1:4994` -- opening a browser up to that should show you the interface.

You can specify a different port using the `--http` option.

    $ neko --http=9001

If you are hosting on a publicly available server instead of a personal computer, you can protect the interface with a password flag --

    $ neko --password=rssisveryimportant
    
## Add Feed

You can add feeds directly from the command line for convenience --

    $ neko --add=http://trenchant.org/rss.xml

## Crawl Feeds

Update feeds from the command line with --

    $ neko --update

This will fetch, download, parse, and store in the database your feeds.

## Export

Export de facto RSS feed standard OPML from the command line with --

    $ neko --export=opml

Change `opml` to `text` for a simple list of feed URLs, or `json` for JSON formatted output.

Export is also available in the web interface.

Import of OPML and other things is a TODO item.

# All Command Line Options

View all command line options with `-h` or `--help`

    $ neko -h

Usage of neko:
  -a, --add http://example.com/rss.xml
    	add the feed at URL http://example.com/rss.xml
  -c, --config string
    	read configuration from file
  -d, --database string
    	sqlite database file
  -x, --export string
    	export feed. format required: text, json or opml
  -h, --help
    	print usage information
  -s, --http int
    	HTTP port to serve on
  -i, --imageproxy
    	rewrite and proxy all image requests for privacy (experimental)
  -m, --minutes int
    	minutes between crawling feeds
  -p, --password string
    	password to access web interface
  -u, --update
    	fetch feeds and store new items
  -v, --verbose
    	verbose output

These are POSIX style flags so --

    $ neko --minutes=120

is equivalent to

    $ neko -m 120

# Configuration File

For convenience, you can specify options in a configuration file.

    $ neko -c /etc/neko.conf

A subset of the command line options are supported in the configuration file, with the same semantics --

   * database
   * http
   * imageproxy
   * minutes
   * password

For example --

```
database: /var/db/neko.db
http: 9001
imageproxy: true
minutes: 90
password: VeryLongRandomStringBecauseSecurityIsFun

```


# TODO

   * manually initiate crawl/refresh from web interface (done: /crawl/)
   * auto-refresh feeds from web interface (wip: but may not be working right)
   * import
   * mark all as read
   * rewrite frontend in a modern js framework
   * prettify interface
   * cross-compilation of binaries for "normal" platforms

# History

## Early 2017

I decided I didn't like the [original version of this that was python and mongo](https://github.com/adammathes/neko_v1) so rewrote it. I wanted to learn some Go. So assume the code is not great since I don't know what I'm doing even more so than normal.

The Javascript frontend is still the same, I keep saying I will rewrite that too since it's old backbone.js code but it still seems to mostly work. It's not very pretty though.

## July 2018 -- v0.2

Significant changes to simplify setup, configuration, usage. The goal was typing `neko` should be all you need to do to get started and use the software.

   * removed MySQL requirement (eliminating a ton of configuration and complexity)
   * added SQLite support (easier!)
   * auto-initialization of database file with embedded schema
   * removed json-formatted config file -- all options are command line options
   * `neko` runs web server by default
   * `neko` server crawls feeds regularly rather than requiring cron

# Feedback

Pull requests and issues are welcomed at https://github.com/adammathes/neko
