# Neko

Simple self-hosted, single user RSS reader focused on efficiency and simplicity. Written in Go with a simple javascript ui frontend.

*the cat ears are in your mind*

## Huh?

I decided I didn't like the [old version that was python and mongo](https://github.com/adammathes/neko_v1) so rewrote it. I wanted to learn some Go. So assume the code is bad since I don't know what I'm doing even more so than normal.

The javascript frontend is still the same, I might rewrite that too since it's old backbone.js code and in the intervening years it looks like nobody uses that anymore.

This is not very easy to use/setup/ yet. Sorry! Consider it WIP, pull requests for containers/snaps/etc welcome.

## Features

   * limited features (#1 feature)
   * keyboard shortcuts
      * **j** - next item
      * **k** - previous item
      * that's all you should ever need
   * automatically marks items read in an infinite stream of never-ending content (until you run out of content and it ends)
   
## Installation

### Prerequesites 

[Go](https://golang.org)

[MySQL](https://dev.mysql.com) or a drop-in replacement like [MariaDB](https://mariadb.com)

PostgreSQL support is left as an exercise for the reader to implement and send a pull request for.

### Set up $GOPATH if one doesn't exist already

    $ mkdir $HOME/go  
    $ export GOPATH=$HOME/go
    
See also: [The GOPATH environment variable](https://golang.org/doc/code.html#GOPATH)

### Get and build neko

    $ go get adammathes.com/neko
   
This will download neko code, dependencies, and build them all in $HOME/go/src/

A `neko` binary should now be in $HOME/go/bin/
   
### Create MySQL table and user

    $ mysqladmin -uroot -p create neko  
    $ mysql -uroot -p neko < init.sql  
    $ echo "probably a good idea to make a limited privilege user"  
    $ mysql -uroot -p neko  
    CREATE USER 'neko'@'localhost' identified by 'yourawesomepasswordgoeshere';  
    GRANT ALL PRIVILEGES ON neko.* TO 'neko'@'localhost';  
       
## Configuration 

Copy example configuration and edit as needed.

    $ cp $HOME/go/src/adammathes.com/neko/config.example config.json

The configuration is JSON which was probably not a good idea.

| name         | value                                            | example        |
|--------------|--------------------------------------------------|----------------|
| `db`         | mysql database connection string                 | root:@tcp(127.0.0.1:3306)/neko |
| `web`        | web address/port to bind to |                    | 127.0.0.0.1:4994 |
| `username`   | username for single user auth                    | user
| `password`   | plaintext -- will be encrypted in client cookie  | notagoodpassword    |
| `static_dir` | absolute path of the static files                |/home/user/go/src/adammathes.com/neko/static/|


### Add Feeds

    $ neko -add http://trenchant.org/rss.xml

Add as many feeds as you'd like to start. You can add more in the web ui later.

Neko will look for a `config.json` in the local directory -- otherwise specify the location with the `-c` flag.

    $ neko -add <url> -c /path/to/config.json

### Crawl Feeds

    $ neko -update

This should fetch, download, parse, and store in the database your feeds.

### Run web server

    $ neko -serve
 
## Running Continuously

### Crawl Regularly Via Cron

Depending on your binaries/configs something like --

    34 * * * * neko -c /etc/neko.config

-- should crawl regularly on the hour in cron.

### Server

Sorry it's 2017 and there are like a bajillion incompatible ways to do this on *nix-alikes and it's ridiculous so I'm probably just going to give up on Linux and use OpenBSD so just run it in tmux or something I guess? I mean, set up an init script with a minimal privileged user. Whatever. UNIX is great, have fun.

There's an example configuration for systemd + nginx in etc in this repo.

## TODO

   * OPML import/export
   * feeds.txt import/export
   * mark all as read cmd
   * comments/docs
   * rewrite frontend in a modern js framework
