export interface Feed {
    _id: number;
    url: string;
    web_url: string;
    title: string;
    category: string;
}

export interface Item {
    _id: number;
    feed_id: number;
    title: string;
    url: string;
    description: string;
    publish_date: string;
    read: boolean;
    starred: boolean;
    full_content?: string;
    header_image?: string;
    feed_title?: string;
}
export interface Category {
    title: string;
}
