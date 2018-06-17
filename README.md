# Neko

`neko` is a self-hosted, rss reader focused on simplicity and efficiency.

Backend is written in `Go` and there is a simple javascript frontend and cat ears.

*the cat ears are in your mind*

## Huh?

I decided I didn't like the [old version that was python and mongo](https://github.com/adammathes/neko_v1) so rewrote it. I wanted to learn some Go. So assume the code is not great since I don't know what I'm doing even more so than normal.

The Javascript frontend is still the same, I might rewrite that too since it's old backbone.js code and in the intervening years it looks like nobody uses that anymore.

This is not very easy to use/setup/ yet. Sorry! Consider it WIP, pull requests for containers/snaps/etc welcome.

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

### Prerequesites 

   * [Go](https://golang.org)
   * Persistence layer via one of either
     * [SQLite](https://sqlite.org/) (newly supported and easiest to setup)
     * [MySQL](https://dev.mysql.com) or a drop-in replacement like [MariaDB](https://mariadb.com)

### Set up $GOPATH if one doesn't exist already

    $ mkdir $HOME/go  
    $ export GOPATH=$HOME/go
    
See also: [The GOPATH environment variable](https://golang.org/doc/code.html#GOPATH)

### Get and build neko

    $ go get adammathes.com/neko
   
This will download neko code, dependencies, and build them all in $HOME/go/src/

A `neko` binary should now be in $HOME/go/bin/

### Database Setup

#### SQLite

Initialize a new SQLite database file with `sqlite.init.sql`

    $ cat sqlite.init.sql | sqlite3 neko.db

#### Create MySQL table and user

This is harder. Use SQLite! MySQL support may be deprecated soonish.

If you are using MySQL or equivalent --

    $ mysqladmin -uroot -p create neko  
    $ mysql -uroot -p neko < init.sql  
    $ echo "probably a good idea to make a limited privilege user"  
    $ mysql -uroot -p neko  
    CREATE USER 'neko'@'localhost' identified by 'yourawesomepasswordgoeshere';  
    GRANT ALL PRIVILEGES ON neko.* TO 'neko'@'localhost';  
    
Initialize the tables with --

    $ cat init.mysql.sql | mysql neko

## Configuration 

Copy example configuration and edit as needed.

    $ cp $HOME/go/src/adammathes.com/neko/config.example config.json

The configuration is JSON which was probably not a good idea.

| name         | value                                            | example        |
|--------------|--------------------------------------------------|----------------|
| `db_driver`  | database driver - sqlite3 or mysql               | sqlite3 |
| `db`         | mysql connection string OR sqlite file           | root:@tcp(127.0.0.1:3306)/neko |
| `web`        | web address/port to bind to                      | 127.0.0.0.1:4994 |
| `username`   | username for single user auth                    | user
| `password`   | plaintext -- will be encrypted in client cookie  | notagoodpassword    |
| `static_dir` | absolute path of the static files                |/home/user/go/src/adammathes.com/neko/static/|


### Add Feeds

    $ neko --add http://trenchant.org/rss.xml

Add as many feeds as you'd like to start. You can add more in the web ui later.

Neko will look for a `config.json` in the local directory -- otherwise specify the location with the `-c` flag.

    $ neko --add <url> -c /path/to/config.json

### Crawl Feeds

    $ neko --update

This should fetch, download, parse, and store in the database your feeds.

### Run web server

    $ neko --serve
    
UI should now be available at the address in your `web` configuration setting.
 
## Operationalize

### Crawl Regularly Via Cron

Depending on your binaries/configs something like --

    34 * * * * neko -c /etc/neko.config -u

-- should crawl regularly on the hour in cron.

### Server as Daemon

There's an example configuration for systemd in etc in this repo that should work for modern Linux systems on systemd.

## Import/Export

Import is a TODO

Export de facto RSS feed standard OPML from the command line with --

    $ neko --export opml

Change `opml` to `text` for a simple list of feed URLs, or `json` for JSON formatted output.


## TODO

   * automate database initializtion
   * embed templates / static files into binary
   * feed / item import
   * mark all as read command
   * rewrite frontend in a modern js framework
   * less ugly frontend
