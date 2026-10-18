<?php
// Local static-export tweaks.

// Drop head links that point at ?p= URLs or dynamic endpoints, so wget
// doesn't save duplicate or dead pages.
remove_action('wp_head', 'wp_shortlink_wp_head', 10);
remove_action('template_redirect', 'wp_shortlink_header', 11);
remove_action('wp_head', 'rsd_link');
remove_action('wp_head', 'wlwmanifest_link');
remove_action('wp_head', 'rest_output_link_wp_head', 10);
remove_action('template_redirect', 'rest_output_link_header', 11);
remove_action('wp_head', 'wp_oembed_add_discovery_links');

// The theme options and post content hard-code the live site's address
// (header image, uploads, links between posts). Point them at this local
// copy so wget downloads them, and turn old ?p= / ?page_id= / ?cat= links
// into direct links to the new pages.
add_action('template_redirect', function () {
    ob_start(function ($html) {
        $home = home_url();
        $html = preg_replace('#(?:https?:)?//(?:www\.|testing\.)?akimbocomics\.com(?=[/"\'\s<)]|$)#i', $home, $html);
        $html = preg_replace('#(?<=["\'])' . preg_quote($home, '#') . '/eo/index\.php#', $home . '/eo/', $html);
        return preg_replace_callback(
            '#' . preg_quote($home, '#') . '/(?:index\.php)?\?(p|page_id|cat|attachment_id)=(\d+)[^"\'\s<]*#',
            function ($m) {
                $id = (int) $m[2];
                $url = $m[1] === 'cat' ? get_category_link($id)
                     : ($m[1] === 'attachment_id' ? wp_get_attachment_url($id) : get_permalink($id));
                return $url ? $url : $m[0];
            },
            $html);
    });
}, 0);
