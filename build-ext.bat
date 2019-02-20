@echo off
@del videogaze-extension.xpi
@"C:\Program Files\7-Zip\7z" a -xr@.gitignore -xr@.xpiignore package.zip *
ren package.zip videogaze-extension.xpi