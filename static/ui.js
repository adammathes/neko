var templates = {};

$(document).ready(function() {
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
        this.set('searchFilter', $('#search').val());
        // this.set('starredFilter', false);
        // this.set('allFilter', true);
        // this.set('unreadFilter', false);
        this.items.reboot();
    },

    update_read_status: function() {
        var screen_top = $(window).scrollTop();
        var screen_bottom = $(window).scrollTop() +  $(window).height();

        // // mark all visible items as read
        $.each($('.item'), function(i,v) {
	        var item_top = $(v).offset().top;
            // console.log("i ", i, "item_top ", item_top, "screen_top ", screen_top, "screen_bottom ", screen_bottom);

            if( (item_top < screen_top)) {
                App.items.at(i).markRead();
            //    console.log('marking as read: ', i);
	        }
        });
//        window.setTimeout(App.update_read_status, 5000);
    },

    scroll_to_selected: function() {
	    var item = $('.item').eq(this.get('selectedIndex'));
        if(item.offset()) {
	        var item_top = item.offset().top;
	        $('.item').removeClass('selected');
	        item.addClass('selected');
	        $(window).scrollTop(item_top);
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

    events: {
        'click .starred_filter': 'filterToStarred',
        'click .all_filter': 'filterToAll',
        'click .unread_filter': 'filterToUnread',
        'click .new_feed': 'newFeed',
        'click .search_go': 'filterToSearch',
    },

    initialize: function() {
	    _.bindAll(this, 'render');
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
        var h = $.tmpl(templates.controls_template, { 'app': this.model.toJSON() });
	    $(this.el).html(h);
	    return this;
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
            $.getJSON('/item/' + this.get('_id'), function(data) {
                var i = App.items.get(data['_id'])
                i.set('full_content', data['full_content']);
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
        $.getJSON(url, function(data) {
            var items = [];
	        $.each(data, function(i,v) {
                var item = new Item(v);
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
	events: {
        "click .star": "star",
        "click .unstar": "unstar",
        "click .full": "full",
    },
	
	initialize: function() {
	    _.bindAll(this, 'render', 'star');
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
        var h = $.tmpl(templates.item_template, { 'item': this.model.toJSON() });
	    $(this.el).html(h);
	    return this;
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
        this.$el.append(view.render().el);
	},
	addAll: function(items) {
	    // Posts.each(this.addOne);
        for(i in items) {
            item = items[i];
            var view = new ItemView({'model': item});
            this.$el.append(view.render().el);
        };
	},
    change: function() {
    },
    render: function() {
    },
    reset: function() {
        this.$el.children().remove();
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
        $.getJSON('/tag/', function(data) {
	        $.each(data, function(i,v) {
                var tag = new Tag(v);
                t.add(tag);
	        });
        });
    }
});
App.tags = new TagCollection();


var TagView = Backbone.View.extend({
	tagName: "li",	
	className: "tag",
	events: {
        "click": "filterTo",
    },
	initialize: function() {
	    _.bindAll(this, 'render', 'filterTo');
	    this.model.bind('change', this.render);
	},
	render: function() {
        var h = $.tmpl(templates.tag_template, { 'tag': this.model.toJSON() });
	    $(this.el).html(h);
	    return this;
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
        this.$el.append(view.render().el);
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
	events: {
        "click .txt": "filterTo",
        "click .delete": "del",
        "click .edit": "edit",
    },
	initialize: function() {
	    _.bindAll(this, 'render', 'filterTo', "del");
	    this.model.bind('change', this.render);
	},
	render: function() {
        var h = $.tmpl(templates.feed_template, { 'feed': this.model.toJSON() });
	    $(this.el).html(h);
	    return this;
	},
    filterTo: function() {
        //        console.log('filtering to feed ', this.model);
        App.filterToFeed(this.model);
    },
    del: function() {
        if( window.confirm("Unsubscribe from " + this.model.get("url") + "?" ) ) {
            this.model.destroy();
            this.$el.remove();
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
        this.$el.append(view.render().el);
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
    templates['item_template'] = $('#item_template').html();
    templates['tag_template'] = $('#tag_template').html();
    templates['feed_template'] = $('#feed_template').html();
    templates['controls_template'] = $('#controls_template').html();

    App.itemListView = new ItemListView();
    App.itemListView.setElement($('#items'));
    App.tagListView = new TagListView();
    App.tagListView.setElement($('#tags'));
    App.feedListView = new FeedListView();
    App.feedListView.setElement($('#feeds'));
    App.controlsView = new ControlsView({model: App});
    App.controlsView.setElement($('#controls'));
    App.controlsView.render();

    infini_scroll();

    $('#unread_filter').on('click', function() {
        App.read_filter = 'unread';
        App.items.reboot();
    });

    $('#all_filter').on('click', function() {
        App.read_filter = 'all';
        App.items.reboot();
    });

//    $('.logo').on('click', function() {
        //        App.set('feedFilter', undefined);
        //        App.items.reboot();
        
//    });

    // keyboard shortcuts
    $('body').keydown(function(event) {
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
        if (event.which == 70) {
	        event.preventDefault();
            App.full();            
        }
    });

    App.boot();
}


// // this is legacy code

function infini_scroll() {
    if(App.loading) {    
    }
    else {
        var dh = $('#items').height() - $(window).height();
        var st = $(window).scrollTop();
        if  ( (dh-st) < 100   ){
            App.items.boot();
        }
    }
    window.setTimeout(infini_scroll, 1000);
}


var ItemSelector =  { 
    selected_index: 0,
}
