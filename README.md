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

## Screenshots

![Alt text](/screenshot/neko.jpg?raw=true "Screenshot 1")

![Alt text](/screenshot/neko2.jpg?raw=true "Screenshot 2")

## Installation

### Requirements

   * [Go](https://golang.org)
   * [SQLite](https://sqlite.org/)
   
### Building

    $ go get adammathes.com/neko
   
This will download `neko`, dependencies, and build them all in `$GOPATH/src/`. By default this should be something like `$HOME/go/src/`.

A `neko` binary should now be in `$GOPATH/bin/`. By default this is usually `$HOME/go/bin/`

## Configuration

There's no configuration file -- everything is handled with a few command line flags. You shouldn't need to change the defaults most of the time.

### Storage

By default `neko` will create the file `neko.db` in the current directory for storage.

You can override the location of this database file with the `--database` command line option.

    $ neko --database=/var/db/neko.db --add=http://trenchant.org/rss.xml

For expert users -- this is a [SQLite](https://sqlite.org/) database and can be manipulated with standard sqlite commands.

## Usage

### Run Web Interface

You can do most of what you need to do with `neko` from the web interface, which is what `neko` does by default.

    $ neko
    
`neko` web interface should now be available at `127.0.0.1:4994` -- opening a browser up to that should show you the interface.

You can specify a different port using the `--http` option.

    $ neko --http=9001

If you are hosting on a publicly available server instead of a personal computer, you can protect the interface with a password flag --

    $ neko --password=rssisveryimportant

### Add Feeds

You can add feeds directly from the command line for convenience --

    $ neko --add=http://trenchant.org/rss.xml

### Crawl Feeds

    $ neko --update

This will fetch, download, parse, and store in the database your feeds.

### Export

Export de facto RSS feed standard OPML from the command line with --

    $ neko --export=opml

Change `opml` to `text` for a simple list of feed URLs, or `json` for JSON formatted output.

Export is also available in the web interface.

Import of OPML and other things is a TODO item.

## Operationalize

### Crawl Regularly Via Cron

Depending on your database file and other bits --

    34 * * * * neko -d /home/neko/neko.db -u

-- should crawl regularly on the hour in cron.

## TODO

   * manually initiate crawl/refresh from web interface
   * auto-refresh feeds from web interface
   * import
   * mark all as read
   * rewrite frontend in a modern js framework
   * prettify interface
   * cross-compilation of binaries for "normal" platforms

## History

### Early 2017

I decided I didn't like the [original version of this that was python and mongo](https://github.com/adammathes/neko_v1) so rewrote it. I wanted to learn some Go. So assume the code is not great since I don't know what I'm doing even more so than normal.

The Javascript frontend is still the same, I keep saying I will rewrite that too since it's old backbone.js code but it still seems to mostly work. It's not very pretty though.

### July 2018

Significant changes to simplify setup, configuration, usage. The goal was typing `neko` should be all you need to do to get started and use the software.

    * removed MySQL requirement (eliminating a ton of configuration and complexity)
    * added SQLite support (easier!)
    * auto-initialization of database file with embedded schema
    * removed json-formatted config file -- all options are command line options
    * `neko` runs web server by default
    * `neko` server crawls feeds regularly rather than requiring cron
