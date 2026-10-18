<?php
// Prints, as JSON, everything needed to map the original WordPress URLs to
// the new static paths. Run inside the WordPress container:
//   docker compose exec -T web php /export-urls.php > wordpress-urls.json
// "url" is the new path (normalize-urls.php must be active), "export_url"
// the path used by the initial export (tag initial-export).
$_SERVER['HTTP_HOST'] = 'localhost:8080';
require '/var/www/html/wp-load.php';

function path_of($url) { return parse_url($url, PHP_URL_PATH); }

$out = array('posts' => array(), 'pages' => array(), 'categories' => array(),
             'tags' => array(), 'authors' => array(), 'months' => array(), 'attachments' => array());

foreach (get_posts(array('post_type' => 'post', 'post_status' => 'publish', 'numberposts' => -1,
                         'orderby' => 'date', 'order' => 'ASC')) as $p) {
    $cat = akimbo_primary_category($p);
    $out['posts'][] = array(
        'id' => $p->ID, 'slug' => $p->post_name, 'title' => html_entity_decode(get_the_title($p), ENT_QUOTES, 'UTF-8'),
        'date' => substr($p->post_date, 0, 10), 'category' => $cat ? $cat->slug : null,
        'url' => path_of(get_permalink($p)),
        'export_url' => '/' . str_replace('-', '/', substr($p->post_date, 0, 10)) . '/' . $p->post_name . '/',
    );
    $ym = substr($p->post_date, 0, 4) . substr($p->post_date, 5, 2);
    if (!isset($out['months'][$ym])) $out['months'][$ym] = path_of(get_permalink($p));
}

foreach (get_pages(array('post_status' => 'publish')) as $p) {
    $out['pages'][] = array('id' => $p->ID, 'slug' => $p->post_name,
                            'title' => html_entity_decode(get_the_title($p), ENT_QUOTES, 'UTF-8'),
                            'url' => path_of(get_permalink($p)), 'export_url' => path_of(get_permalink($p)));
}

foreach (get_categories(array('hide_empty' => false)) as $c) {
    $out['categories'][] = array('id' => $c->term_id, 'slug' => $c->slug, 'name' => html_entity_decode($c->name, ENT_QUOTES, 'UTF-8'),
                                 'url' => path_of(get_category_link($c)),
                                 'export_url' => '/category/' . trim(get_category_parents($c->term_id, false, '/', true), '/') . '/');
}

foreach (get_tags(array('hide_empty' => false)) as $t) {
    $out['tags'][] = array('id' => $t->term_id, 'slug' => $t->slug, 'url' => path_of(get_tag_link($t)));
}

foreach (get_users() as $u) {
    $out['authors'][] = array('id' => $u->ID, 'slug' => $u->user_nicename, 'url' => path_of(get_author_posts_url($u->ID)));
}

foreach (get_posts(array('post_type' => 'attachment', 'post_status' => 'inherit', 'numberposts' => -1)) as $a) {
    $out['attachments'][] = array('id' => $a->ID, 'file' => path_of(wp_get_attachment_url($a->ID)));
}

echo json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), "\n";
