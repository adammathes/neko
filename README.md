# Neko

RSS Reader focused on cat ears mode

*the cat ears are in your mind*

Personal web based RSS reader thing

## Huh?

I decided I didn't like the [old version that was python and mongo](https://github.com/adammathes/neko_v1) so rewrote it. I wanted to learn some Go. So assume the code is bad since I don't know what I'm doing even more so than normal.

The javascript frontend is still the same, I might rewrite that too since it's old backbone.js code.

This is not very easy to use/setup/or anything. Sorry! Consider it WIP.

## Features

   * limited features (#1 feature)
   * keyboard shortcuts
      * **j** - next item
      * **k** - previous item
      * that's all you should ever need
   * automatically marks items read in an infinite stream of neve-rending content (until you run out of content and it ends)
   
## TODO

   * OPML import/export
   * feeds.txt import/export
   * mark all as read
   * proper code comments

## Installation

### [Install golang](https://golang.org)

Go is great! Yay!

### Set up $GOPATH if one doesn't exist already

    ```
    $ mkdir $HOME/go  
    $ export GOPATH=$HOME/go
    ```
    
### Get neko code

    ```
    $ go get github.com/adammathes/neko 
    ```

### Get dependencies

   
    ```
    $ cd $HOME/go/src/github.com/adammathes/neko  
    $ make deps  
    OR  
    $ go get [each dependency listed in the Makefile you ignored]  
    ```
    
### Build


    ```
    $ go build cmd/nekoweb  
    $ go build cmd/nekocrawl  
    ```
    
This should create "nekoweb" and "nekocrawl" binaries because command line flags are annoying.

### Create MySQL table and user

    ```
    $ msyqladmin -uroot -p create neko  
    $ mysql -uroot -p neko < init.sql  
    $ echo "probably a good idea to make a limited privilege user"  
    $ mysql -uroot -p neko  
    CREATE USER 'neko'@'localhost' identified by 'password' yourgreatpasswordhere;  
    GRANT ALL PRIVILEGES ON neko.* TO 'neko'@'localhost';  
    ```
       
### Configuration - copy example configuration and edit as needed  

The configuration is JSON which was probably not a good idea. Sorry? It should be straightforward.

    ```
    $ cp config.example config.json
    ```
    
### Run web

    ```
    $ ./nekoweb config.json
    ```
    
Load URL/port specified in config. Add some feeds! There's an import command that would make this easier but it's wonky (neko addfeed <url>)

    
### Run Crawler

    ```
    $ ./nekocrawl config.json
    ```
    
This should fetch, download, parse, and store in the database your feeds.


### Operationalize

#### Add to cron

Place your binaries and config files some place reasonable and add this to your cron.

    ```
    34 * * * * ~/bin/nekocrawl ~/neko_config.json &> /dev/null
    ```

#### Daemonize server

Sorry it's 2017 and there are like a bajillion incompatible ways to do this on *nix-alikes and it's ridiculous so I'm probably just going to give up on Linux and use OpenBSD so just run it in tmux or something I guess? I mean, set up an init script with a minimal privileged user. Whatever. UNIX is great, have fun.
