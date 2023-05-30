<?php
header('Content-Type: image/x-icon');

const SIZE = 16;
const WALL = 1;
const GROUND = 0;

$favicon     = imagecreatetruecolor(SIZE, SIZE);
$wallColor   = imagecolorallocate($favicon, 165, 80, 30);
$groundColor = imagecolorallocate($favicon, 203, 162, 133);

imagefill($favicon, 0, 0, $wallColor);

$maze = array();
for ($y = 0; $y < SIZE; $y++) {
    $maze[$y] = array();
    for ($x = 0; $x < SIZE; $x++) {
        $maze[$y][$x] = WALL;
    }
}

function dig($position) {
    global $maze;
    global $favicon;
    global $groundColor;
    $directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    shuffle($directions);
    foreach ($directions as $direction) {
        $step1 = [$position[0] + $direction[0], $position[1] + $direction[1]];
        $step2 = [$step1[0] + $direction[0], $step1[1] + $direction[1]];
        if (0 <= $step2[1] and $step2[1] < SIZE and 0 <= $step2[0] and $step2[0] < SIZE and $maze[$step2[1]][$step2[0]] == WALL) {
            $maze[$step1[1]][$step1[0]] = GROUND;
            imagesetpixel($favicon, $step1[0], $step1[1], $groundColor);
            $maze[$step2[1]][$step2[0]] = GROUND;
            imagesetpixel($favicon, $step2[0], $step2[1], $groundColor);
            dig($step2);
        }
    }
}

dig([1, 1]);
imagebmp($favicon);
imagedestroy($favicon);
?>