var templates = {};

function getOffset(el) {
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX
  };
}

// Helper function to safely access nested properties
function getProperty(obj, path) {
    if (!path) return undefined;
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length; i++) {
        if (current && typeof current === 'object' && parts[i] in current) {
            current = current[parts[i]];
        } else {
            return undefined;
        }
    }
    return current;
}

// Basic HTML escaping function for ${...}
function escapeHtml(unsafe) {
    if (unsafe === undefined || unsafe === null) return '';
    return String(unsafe)
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function renderTemplate(templateString, dataObject) {
    let result = templateString;

    // 1. Handle {{html property}}
    result = result.replace(/{{\s*html\s+([a-zA-Z0-9_.]+)\s*}}/g, (match, propertyPath) => {
        const value = getProperty(dataObject, propertyPath);
        return value !== undefined ? String(value) : ''; // Render as raw HTML
    });

    // 2. Handle {{if condition}}...{{else}}...{{/if}}
    // This regex handles simple, non-nested if/else blocks.
    // It needs to be applied iteratively if there are multiple such blocks.
    const ifRegex = /{{\s*if\s+([a-zA-Z0-9_.]+)\s*}}([\s\S]*?)(?:{{\s*else\s*}}([\s\S]*?))?{{\s*\/if\s*}}/;
    let match;
    while ((match = ifRegex.exec(result)) !== null) {
        const conditionPath = match[1];
        const ifContent = match[2];
        const elseContent = match[3] || ''; // Handles cases with no {{else}}

        const conditionValue = getProperty(dataObject, conditionPath);

        if (conditionValue) {
            // Recursively render the 'if' block content
            result = result.replace(match[0], renderTemplate(ifContent, dataObject));
        } else {
            // Recursively render the 'else' block content
            result = result.replace(match[0], renderTemplate(elseContent, dataObject));
        }
    }

    // 3. Handle ${property}
    result = result.replace(/\$\{([a-zA-Z0-9_.]+)\}/g, (match, propertyPath) => {
        const value = getProperty(dataObject, propertyPath);
        return escapeHtml(value); // Escape HTML for variables
    });

    return result;
}


document.addEventListener('DOMContentLoaded', function() {
    if ( window.innerWidth < 1024 ) {
        document.querySelector('#filters').classList.add('hidden');
    }
    document.body.className = localStorage.getItem('theme');
    boot();
});

var AppModel =  Backbone.Model.extend({
    defaults: {
        'selectedIndex': 0,
        'starredFilter': false,
        'allFilter': false,
        'unreadFilter': true,
        'feedFilter': undefined,
        'searchFilter': undefined
    },

    initialize: function() {
        this.bind('change:selectedIndex', this.scroll_to_selected);
//        this.bind('change:selectedIndex', this.scroll_to_selected)
    },

    boot: function() {
        this.items.boot();
        this.tags.boot();
        this.feeds.fetch({set: true, remove: false})
        window.setInterval(function() { App.update_read_status() }, 5000);
    },

    filterToFeed: function(feed) {
        if (feed.get('selected')) {
            feed.set('selected', false);
            this.set('feedFilter', undefined);
        }
        else {
            App.tags.models.forEach ( function (t) {
                t.set('selected', false);
            });
            App.tag = null;
            App.feeds.models.forEach ( function (f) {
                f.set('selected', false);
            });

            this.set('feedFilter', feed);
            feed.set('selected', true);
        }
        this.items.reboot();
    },

    filterToTag: function(tag) {
        App.tag = null;
        if (tag.get('selected')) {
            tag.set('selected', false);
        }
        else {
            App.tags.models.forEach ( function (t) {
                t.set('selected', false);
            });
            App.feeds.models.forEach ( function (f) {
                f.set('selected', false);
            });
            this.set('feedFilter', undefined);
            tag.set('selected', true);
            App.tag = tag.get('title');
        }
        App.items.reboot();
    },

    filterToStarred: function() {
        this.set('starredFilter', true);
        this.set('allFilter', false);
        this.set('unreadFilter', false);
        this.items.reboot();
    },

    filterToAll: function() {
        this.set('searchFilter', undefined);
        this.set('starredFilter', false);
        this.set('allFilter', true);
        this.set('unreadFilter', false);
        this.items.reboot();
    },

    filterToUnread: function() {
        this.set('starredFilter', false);
        this.set('allFilter', false);
        this.set('unreadFilter', true);
        this.items.reboot();
    },

    filterToSearch: function() {
        this.set('searchFilter', document.querySelector('#search').value);
        this.set('starredFilter', false);
        this.set('allFilter', true);
        this.set('unreadFilter', false);
        this.items.reboot();
    },

    update_read_status: function() {
        var screen_top = window.scrollY;
        var screen_bottom = window.scrollY +  window.innerHeight;

        // // mark all visible items as read
        // $.each($('.item'), function(i,v) { // $.each will be handled later
        document.querySelectorAll('.item').forEach(function(v, i) {
            var item_top = getOffset(v).top;
            // console.log("i ", i, "item_top ", item_top, "screen_top ", screen_top, "screen_bottom ", screen_bottom);

            if( (item_top < screen_top)) {
                App.items.at(i).markRead();
            //    console.log('marking as read: ', i);
            }
        });
//        window.setTimeout(App.update_read_status, 5000);
    },

    scroll_to_selected: function() {
        var items = document.querySelectorAll('.item');
        var item = items[this.get('selectedIndex')];
        if(item && getOffset(item)) { // ensure item exists
            var item_top = getOffset(item).top;
            items.forEach(function(el) {
                el.classList.remove('selected');
            });
            item.classList.add('selected');
            window.scrollTo(0, item_top);
        }
        App.items.at(this.get('selectedIndex')).markRead();
        if(App.items.models.length>1) {
            if(this.get('selected')>=App.items.models.length-1) {
                App.items.boot();
            }
        }
    },

    next: function() {
        if(this.get('selectedIndex') < this.items.models.length-1) {
            this.set('selectedIndex', this.get('selectedIndex')+1);
        }
        if(this.get('selectedIndex') == this.items.models.length-1) {
            App.items.boot();
        }
    },

    previous: function() {
        if(this.get('selectedIndex') > 0) {
            this.set('selectedIndex', this.get('selectedIndex')-1);
        }
    },

    star: function() {
        if(this.get('selectedIndex') >= 0) {
            App.items.at(this.get('selectedIndex')).toggleStar();
        }
    },

    full: function() {
        if(this.get('selectedIndex') >= 0) {
            App.items.at(this.get('selectedIndex')).full();
        }
    }

});
var App = new AppModel();

var ControlsView = Backbone.View.extend({
    className: 'controls',

    // events hash removed
    initialize: function() {
        _.bindAll(this, 'render', 'filterToStarred', 'filterToAll', 'filterToUnread', 'newFeed', 'filterToSearch', 'lightTheme', 'darkTheme', 'blackTheme');
        this.model.bind('change', this.render);
    },

    filterToStarred: function() {
        App.filterToStarred();
    },

    filterToAll: function() {
        App.filterToAll();
    },

    filterToUnread: function() {
        App.filterToUnread();
    },

    filterToSearch: function() {
        App.filterToSearch();
    },

    newFeed: function() {
        var feed_url = prompt('New url to subscribe to');
        var feed = new Feed({'url': feed_url});
        App.feeds.add(feed);
        feed.save();
    },

    render: function() {
        var h = renderTemplate(templates.controls_template, { 'app': this.model.toJSON() });
        this.el.innerHTML = h;
        this.attachEvents();
        return this;
    },

    attachEvents: function() {
        const starredFilterEl = this.el.querySelector('.starred_filter');
        if (starredFilterEl) starredFilterEl.addEventListener('click', this.filterToStarred);

        const allFilterEl = this.el.querySelector('.all_filter');
        if (allFilterEl) allFilterEl.addEventListener('click', this.filterToAll);

        const unreadFilterEl = this.el.querySelector('.unread_filter');
        if (unreadFilterEl) unreadFilterEl.addEventListener('click', this.filterToUnread);

        const newFeedEl = this.el.querySelector('.new_feed');
        if (newFeedEl) newFeedEl.addEventListener('click', this.newFeed);

        const searchGoEl = this.el.querySelector('.search_go');
        if (searchGoEl) searchGoEl.addEventListener('click', this.filterToSearch);

        const lightThemeEl = this.el.querySelector('.light_theme');
        if (lightThemeEl) lightThemeEl.addEventListener('click', this.lightTheme);

        const darkThemeEl = this.el.querySelector('.dark_theme');
        if (darkThemeEl) darkThemeEl.addEventListener('click', this.darkTheme);

        const blackThemeEl = this.el.querySelector('.black_theme');
        if (blackThemeEl) blackThemeEl.addEventListener('click', this.blackTheme);
    },

    lightTheme: function() {
        document.body.className = "light";
        localStorage.setItem("theme", "light");
    },

    darkTheme: function() {
        document.body.className = "dark";
        localStorage.setItem("theme", "dark");
    },

    blackTheme: function() {
        document.body.className = "black";
        localStorage.setItem("theme", "black");
    },
    
});



var Item = Backbone.Model.extend({
    idAttribute: "_id",
    url: '/item/',

    initialize: function() {
        var p_url = this.get('url');
        p_url = p_url.replace('https://', '');
        p_url = p_url.replace('http://', '');
        this.set('p_url', p_url);
        this.bind('change', this.maybeSave);
    },

    maybeSave: function() {
        if(this.hasChanged()) {
            this.save();
        }
    },

    markRead: function() {
        // recover if not tag
        if(this.get('read')) {
            return;
        }

        // var t = this.get('feed').tag;
        // var tag = App.tags.find(function(x){ return x.get('name') == t });
        this.set('read', true);
        // if(tag) {
        //     tag.set('unread', tag.get('unread')-1);
        // }
    },

    toggleStar: function() {
        this.set({'starred': !(this.get('starred'))} );
    },

    star: function() {
        this.set({'starred': true});
    },

    unstar: function() {
        this.set({'starred': false});
    },

    full: function() {
        this.set({'full': !(this.get('full'))} );
        // this should just use this.fetch() but
        // it kept GETing from /item instead of /item/id
        // so just hacking this in for now

        if(this.get('full_content') == "") {
            fetch('/item/' + this.get('_id'))
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok: ' + response.statusText);
                    }
                    return response.json();
                })
                .then(data => {
                    var i = App.items.get(data['_id']);
                    i.set('full_content', data['full_content']);
                })
                .catch(error => {
                    console.error('There was a problem with the fetch operation:', error);
                });
        }
    }

});


var ItemCollection = Backbone.Collection.extend({
    model: Item,

    initialize: function() {
        _.bindAll(this, 'boot', 'reboot');
    },

    boot: function() {
        if(App.loading) {
            return;
        }
        if(App.noMore) {
            return;
        }

        App.loading = true;
        url = '/stream/';
        url=url+'?foo=bar'
        if(App.get('searchFilter')) {
            url = url + '&q=' + App.get('searchFilter');
        }
        if(App.get('feedFilter')) {
            url = url + '&feed_url=' + App.get('feedFilter').get('url');
        }
        if(App.get('starredFilter')) {
            url = url + '&starred=1';
        }
        if(App.tag != undefined) {
            url = url + '&tag=' + App.tag;
        }
        if(App.items.last()) {
             url = url + '&max_id=' + App.items.last().get('_id');
        }

        if(App.get('allFilter') || App.get('starredFilter')) {
            url = url + '&read_filter=all';
        }

        console.log('fetching from ', url);
        var t = this;
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok: ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                var items = [];
                data.forEach(function(itemData, index) {
                    var item = new Item(itemData);
                    t.add(item);
                    items.push(item);
                    if(t.models.length==1){
                        App.set('selectedIndex', 0);
                    }
                });
                // console.log("items ", items)
                if(items.length == 0) {
                    // console.log("no more items");
                    App.noMore = true;
                    // App.loading = true;
                }
                else {
                    App.loading = false;
                }
                // we wait and add them all at once for performance on mobile
                App.itemListView.addAll(items);
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
                App.loading = false; // Reset loading state on error
            });
    },

    reboot: function() {
        App.noMore = false;
        App.loading = false;
        this.reset();
        this.boot();
    },


});
App.items = new ItemCollection();


var ItemView = Backbone.View.extend({
    tagName: "div",
    className: "item",
    template: templates.item_template,
    // events hash removed

    initialize: function() {
        _.bindAll(this, 'render', 'star', 'unstar', 'full');
        this.model.bind('change', this.render);
    },

    star: function() {
        this.model.star();
        this.render();
    },

    unstar: function() {
        this.model.unstar();
        this.render();
    },

    full: function() {
        this.model.full();
        this.render();
    },

    render: function() {
        var h = renderTemplate(templates.item_template, { 'item': this.model.toJSON() });
        this.el.innerHTML = h;
        this.attachEvents();
        return this;
    },

    attachEvents: function() {
        const starEl = this.el.querySelector('.star');
        if (starEl) starEl.addEventListener('click', this.star);

        const unstarEl = this.el.querySelector('.unstar');
        if (unstarEl) unstarEl.addEventListener('click', this.unstar);

        const fullEl = this.el.querySelector('.full');
        if (fullEl) fullEl.addEventListener('click', this.full);
    },
});

var ItemListView = Backbone.View.extend( {
    initialize: function() {
        _.bindAll(this, 'addOne', 'addAll', 'change', 'render', 'reset');
        // App.items.bind('add', this.addOne);
        App.items.bind('reset', this.reset);
    },
    addOne: function(item) {
        var view = new ItemView({'model': item});
        this.el.appendChild(view.render().el);
    },
    addAll: function(items) {
        // Posts.each(this.addOne);
        for(i in items) {
            item = items[i];
            var view = new ItemView({'model': item});
            this.el.appendChild(view.render().el);
        };
    },
    change: function() {
    },
    render: function() {
    },
    reset: function() {
        // this.$el.children().remove();
        while (this.el.firstChild) {
            this.el.removeChild(this.el.firstChild);
        }
    }
});

var Tag = Backbone.Model.extend({
});

var TagCollection = Backbone.Collection.extend({
    model: Tag,
    initialize: function() {
        _.bindAll(this, 'boot');
    },

    boot: function() {
        var t = this;
        fetch('/tag/')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok: ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                data.forEach(function(tagData, index) {
                    var tag = new Tag(tagData);
                    t.add(tag);
                });
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });
    }
});
App.tags = new TagCollection();


var TagView = Backbone.View.extend({
    tagName: "li",	
    className: "tag",
    // events hash removed

    initialize: function() {
        _.bindAll(this, 'render', 'filterTo');
        this.model.bind('change', this.render);
    },
    render: function() {
        var h = renderTemplate(templates.tag_template, { 'tag': this.model.toJSON() });
        this.el.innerHTML = h;
        this.attachEvents();
        return this;
    },

    attachEvents: function() {
        // Event is directly on this.el
        this.el.addEventListener('click', this.filterTo);
    },

    filterTo: function() {
        App.filterToTag(this.model);
    }
});


var TagListView = Backbone.View.extend( {

    initialize: function() {
        _.bindAll(this, 'addOne', 'addAll', 'change', 'render');
        App.tags.bind('add', this.addOne);
        App.tags.bind('refresh', this.addAll);
        App.tags.bind('change', this.render);
    },
    addOne: function(tag) {
        var view = new TagView({'model': tag});
        this.el.appendChild(view.render().el);
    },
    addAll: function() {
        App.tags.each(this.addOne);
    },
    change: function() {
    },
    render: function() {
    },
});

App.tag = undefined;
App.page = 0;
App.read_filter = 'unread';


var Feed = Backbone.Model.extend({
    idAttribute: "_id",
});

var FeedCollection = Backbone.Collection.extend({
    model: Feed,
    url: '/feed/',

    initialize: function() {
        ///    _.bindAll(this, 'boot');
        //console.log('initialized');
    },
});
App.feeds = new FeedCollection();

var FeedView = Backbone.View.extend({
    tagName: "li",
    className: "feed",
    // events hash removed

    initialize: function() {
        _.bindAll(this, 'render', 'filterTo', "del", "edit"); // Added 'edit' to bindAll
        this.model.bind('change', this.render);
    },
    render: function() {
        var h = renderTemplate(templates.feed_template, { 'feed': this.model.toJSON() });
        this.el.innerHTML = h;
        this.attachEvents();
        return this;
    },

    attachEvents: function() {
        const txtEl = this.el.querySelector('.txt');
        if (txtEl) txtEl.addEventListener('click', this.filterTo);

        const deleteEl = this.el.querySelector('.delete');
        if (deleteEl) deleteEl.addEventListener('click', this.del);

        const editEl = this.el.querySelector('.edit');
        if (editEl) editEl.addEventListener('click', this.edit);
    },

    filterTo: function() {
        //        console.log('filtering to feed ', this.model);
        App.filterToFeed(this.model);
    },
    del: function() {
        if( window.confirm("Unsubscribe from " + this.model.get("url") + "?" ) ) {
            this.model.destroy();
            this.el.remove();
        }
    },
    edit: function() {
        var cat = window.prompt("Category for this feed?", this.model.get("category"));
        if (cat != null) {
            this.model.set("category", cat);
            this.model.save();
        }
    },
});


var FeedListView = Backbone.View.extend( {
    initialize: function() {
        _.bindAll(this, 'addOne', 'addAll', 'change', 'render');
        App.feeds.bind('add', this.addOne);
        App.feeds.bind('refresh', this.addAll);
        App.feeds.bind('change', this.render);
    },
    addOne: function(feed) {
        // console.log('adding a feed...', feed);
        var view = new FeedView({'model': feed});
        this.el.appendChild(view.render().el);
    },
    addAll: function() {
        // console.log('feed add all...');
        App.feeds.each(this.addOne);
    },
    change: function() {
        // console.log('feeds changed add all...');
    },
    render: function() {
    },
});


// var page = 0;
// var read_filter = 'unread';

var selected_item = 0;

function boot() {
    templates['item_template'] = document.querySelector('#item_template').innerHTML;
    templates['tag_template'] = document.querySelector('#tag_template').innerHTML;
    templates['feed_template'] = document.querySelector('#feed_template').innerHTML;
    templates['controls_template'] = document.querySelector('#controls_template').innerHTML;

    App.itemListView = new ItemListView();
    App.itemListView.setElement(document.querySelector('#items'));
    App.tagListView = new TagListView();
    App.tagListView.setElement(document.querySelector('#tags'));
    App.feedListView = new FeedListView();
    App.feedListView.setElement(document.querySelector('#feeds'));
    App.controlsView = new ControlsView({model: App});
    App.controlsView.setElement(document.querySelector('#controls'));
    App.controlsView.render();

    infini_scroll();

    document.querySelector('#unread_filter').addEventListener('click', function() {
        App.read_filter = 'unread';
        App.items.reboot();
    });

    document.querySelector('#all_filter').addEventListener('click', function() {
        App.read_filter = 'all';
        App.items.reboot();
    });

//    document.querySelector('.logo').addEventListener('click', function() { // Example, if it were to be uncommented
        //        App.set('feedFilter', undefined);
        //        App.items.reboot();

//    });

    // keyboard shortcuts
    document.body.addEventListener('keydown', function(event) {
        if(document.activeElement.id == "search") {
            return;
        }
        if (event.which == 74) {
            event.preventDefault();
            App.next();
        }
        if (event.which == 75) {
            event.preventDefault();
            App.previous();
        }
        if (event.which == 83) {
            event.preventDefault();
            App.star();
        }
    });

    App.boot();
}


// // this is legacy code

function infini_scroll() {
    if(App.loading) {
    }
    else {
        var itemsEl = document.querySelector('#items');
        // Ensure itemsEl is not null before trying to get its height
        var dh = (itemsEl ? itemsEl.offsetHeight : 0) - window.innerHeight;
        var st = window.scrollY;
        if  ( (dh-st) < 100   ){
            App.items.boot();
        }
    }
    window.setTimeout(infini_scroll, 1000);
}

var ItemSelector =  {
    selected_index: 0,
}
