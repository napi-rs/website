# GitHub Actions update

> 📅 2022/07/22

There are two big changes that happened in GitHub Actions:

## Android NDK

Android NDK **22** on GitHub Actions was replaced in favor of **24**, version **23** will be set as the default one: https://github.com/actions/virtual-environments/issues/5595.

For NAPI-RS projects, there may some issues with the new NDK:

1. The `arm-linux-androideabi-strip` and `aarch64-linux-android-strip` don't exist anymore, we need to use `llvm-strip` to replace them in pipeline. So if your pipeline failed because the `arm-linux-androideabi-strip` or `aarch64-linux-android-strip` doesn't exist, please replace them to `llvm-strip` instead:

```diff
- ${ANDROID_NDK_HOME}/toolchains/llvm/prebuilt/linux-x86_64/bin/arm-linux-androideabi-strip *.node
+ ${ANDROID_NDK_HOME}/toolchains/llvm/prebuilt/linux-x86_64/bin/llvm-strip *.node
```

```diff
- ${ANDROID_NDK_HOME}/toolchains/llvm/prebuilt/linux-x86_64/bin/aarch64-linux-androideabi-strip *.node
+ ${ANDROID_NDK_HOME}/toolchains/llvm/prebuilt/linux-x86_64/bin/llvm-strip *.node
```

2. The `arm-linux-androideabi-ar` and `aarch64-linux-androideabi-ar` doesn't exist on NDK bin path anymore, your build may failed with **_error occurred: Failed to find tool. Is `arm-linux-androideabi-ar` installed?_** or **_error occurred: Failed to find tool. Is `aarch64-linux-androideabi-ar` installed?_**. You need to export `AR` environment variable to point to the correct `ar` path:

```diff
  export CXX="${ANDROID_NDK_HOME}/toolchains/llvm/prebuilt/linux-x86_64/bin/armv7a-linux-androideabi24-clang++"
+ export AR="${ANDROID_NDK_HOME}/toolchains/llvm/prebuilt/linux-x86_64/bin/llvm-ar"
  export PATH="${ANDROID_NDK_HOME}/toolchains/llvm/prebuilt/linux-x86_64/bin:${PATH}"
```

```diff
  export CXX="${ANDROID_NDK_HOME}/toolchains/llvm/prebuilt/linux-x86_64/bin/aarch64-linux-androideabi24-clang++"
+ export AR="${ANDROID_NDK_HOME}/toolchains/llvm/prebuilt/linux-x86_64/bin/llvm-ar"
  export PATH="${ANDROID_NDK_HOME}/toolchains/llvm/prebuilt/linux-x86_64/bin:${PATH}"
```

## macOS 10.15 is being deprecated

https://github.blog/changelog/2022-07-20-github-actions-the-macos-10-15-actions-runner-image-is-being-deprecated-and-will-be-removed-by-8-30-22/

This does not affect the macOS builds, but it will make the `freebsd-x64` pipeline fail. You can easily fix it by upgrading the `vmactions/freebsd-vm`:

```diff
  build-freebsd:
-   runs-on: macos-10.15
+   runs-on: macos-12
    name: Build FreeBSD
    steps:
      - uses: actions/checkout@v3
      - name: Build
        id: build
-       uses: vmactions/freebsd-vm@v0.1.6
+       uses: vmactions/freebsd-vm@v0.2.0
```

Happy hacking :)
