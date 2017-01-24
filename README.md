# Neko

RSS Reader focused on cat ears mode

*the cat ears are in your mind*

## Huh?

I decided I didn't like the [old version that was python and mongo](https://github.com/adammathes/neko_v1) so rewrote it. I wanted to learn some Go. So assume the code is bad since I don't know what I'm doing even more so than normal.

The javascript frontend is still the same, I might rewrite that too since it's old backbone.js code.

This is not very easy to use/setup/or anything. Sorry! Consider it WIP.

## Installation

1. [Install golang](https://golang.org)

2. Set up $GOPATH if one doesn't exist already

    $ mkdir $HOME/go  
    $ export GOPATH=$HOME/go
    
3. Get neko code
   
   $ go get github.com/adammathes/neko 

4. Get dependencies

    $ cd $HOME/go/src/github.com/adammathes/neko  
    $ make deps  
    OR  
    $ go get [each dependency listed in the Makefile you ignored]  

5. Build binaries

    $ go build cmd/nekoweb  
    $ go build cmd/nekocrawl  

    This should create "nekoweb" and "nekocrawl" binaries

6. Create MySQL table and user

    $ msyqladmin -uroot -p create neko  
    $ mysql -uroot -p neko < init.sql  
    $ echo "probably a good idea to make a limited privilege user"  
    $ mysql -uroot -p neko  
    CREATE USER 'neko'@'localhost' identified by 'password' yourgreatpasswordhere;  
    GRANT ALL PRIVILEGES ON neko.* TO 'neko'@'localhost';  
        
7. Configuration - copy example configuration and edit as needed  

    $ cp config.example config.json
    
8. Run web

    $ ./nekoweb config.json
    
    Load URL/port specified in config. Add feeds
    
9. Run Crawler

    $ ./nekocrawl config.json
    
10. Operationalize

    [ add to cron ]  
    [ add daemon for server ]
