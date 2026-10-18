<?php
// Local export only: one top-level folder per comic series (category),
// one subfolder per post:  /<category-slug>/<post-slug>/
// Category listings live at /<category-slug>/ (paged: /<category-slug>/page/N/).
// Parent categories are flattened, so completed comics aren't nested.

// The most specific (deepest) category of a post; ties go to the lowest id.
function akimbo_primary_category($post) {
    $best = null; $best_depth = -1;
    foreach (get_the_category($post->ID) as $c) {
        $depth = count(get_ancestors($c->term_id, 'category'));
        if ($depth > $best_depth || ($depth == $best_depth && $c->term_id < $best->term_id)) {
            $best = $c; $best_depth = $depth;
        }
    }
    return $best;
}

add_filter('post_link', function ($link, $post) {
    if ($post->post_type !== 'post' || $post->post_status !== 'publish') return $link;
    $cat = akimbo_primary_category($post);
    return $cat ? home_url('/' . $cat->slug . '/' . $post->post_name . '/') : $link;
}, 10, 2);

add_filter('category_link', function ($link, $term_id) {
    $c = get_term($term_id, 'category');
    return home_url('/' . $c->slug . '/');
}, 10, 2);

add_action('init', function () {
    foreach (get_categories(array('hide_empty' => false)) as $c) {
        $s = preg_quote($c->slug, '#');
        add_rewrite_rule("^$s/page/([0-9]+)/?$", 'index.php?category_name=' . $c->slug . '&paged=$matches[1]', 'top');
        add_rewrite_rule("^$s/([^/]+)/comment-page-([0-9]+)/?$", 'index.php?name=$matches[1]&cpage=$matches[2]', 'top');
        add_rewrite_rule("^$s/([^/]+)/?$", 'index.php?name=$matches[1]', 'top');
        add_rewrite_rule("^$s/?$", 'index.php?category_name=' . $c->slug, 'top');
    }
});

// Don't let WordPress "correct" these URLs back to its own idea of them.
remove_action('template_redirect', 'redirect_canonical');
