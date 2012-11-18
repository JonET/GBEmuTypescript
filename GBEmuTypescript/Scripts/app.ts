/// <reference path="jquery.d.ts" />
/// <reference path="GameboyEmulator/GameboyEmulator.ts"/>

jQuery(() => {
    var emulator = new GameboyEmulator.Emulator();
    emulator.start();
});