<?php
header('Content-Type: image/x-icon');

const SIZE = 16;

$x = filter_input(INPUT_GET, "x", FILTER_SANITIZE_NUMBER_INT);
$y = filter_input(INPUT_GET, "y", FILTER_SANITIZE_NUMBER_INT);

$favicon = imagecreatefrombmp("favicon.ico");

$red = imagecolorallocate($favicon, 255, 0, 0);
imagesetpixel($favicon, $x, $y, $red);

imagebmp($favicon);
imagedestroy($favicon);
?>