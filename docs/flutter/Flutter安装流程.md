---
title: Flutter安装环境配置  
description: Flutter安装环境配置
category: Flutter
tag:
  - Flutter
---


## Fluter 环境安装准备工具
![image.png](./img/flutter%20install/1.jpg)

### 1.  第一步先安装java sdk,安装完成后进行系统环境变量配置,并在cmd 运行java查看安装是否成功

![image.png](./img/flutter%20install/2.jpg)

![image.png](./img/flutter%20install/3.jpg)

### 2 安装 android-studio
![image.png](./img/flutter%20install/4.jpg)

> 在android-studio安装完成后,安装下Dart 和 Flutter插件,重启下android-studio,

![image.png](./img/flutter%20install/5.jpg)

> 这样就可以看见有创建Flutter项目选项了

![image.png](./img/flutter%20install/6.jpg)

### 3.  安装flutter sdk
> 只需要将flutter\_windows\_3.24.5-stable.zip压缩文件夹就行,配置flutter国内镜像,一样在环境变量中新建变量进行设置

![image.png](./img/flutter%20install/7.jpg)
![image.png](./img/flutter%20install/8.jpg)
  
```
PUB_HOSTED_URL :  https://pub.flutter-io.cn 
FLUTTER_STORAGE_BASE_URL : https://storage.flutter-io.c
```

![image.png](./img/flutter%20install/9.jpg)
![image.png](./img/flutter%20install/10.jpg)

### 5. flutter doctor  检测安装环境

![image.png](./img/flutter%20install/11.jpg)

> Android的都环境出现 cmdline-tools component is missing错误时,在android-studio 把下面红圈的sdk下载一下就行

![image.png](./img/flutter%20install/12.jpg)

![image.png](./img/flutter%20install/13.jpg)

```
flutter config --android-sdk E:\AndroidSdk  
```

[错误问题解决参考](https://bbs.itying.com/topic/67d3daf436bb8501317028c1)

### 6.Windows 桌面开发(可跳过)
> 当然你准备使用Flutter桌面端开发需求,需要安装Visual Studio

![image.png](./img/flutter%20install/14.jpg)

> 在安装时我只需要安装C++ 桌面开发选项,以及自己对应的系统sdk版本,W11的就选W11最新版本,W10也是一样不要串版本了,勾选完直接安装就行

![image.png](./img/flutter%20install/15.jpg)

> 这时我们再去运行 flutter doctor 命令时,flutter环境应该全都是正确的

![image.png](./img/flutter%20install/16.jpg)

### 7.创建Flutter项目

![image.png](./img/flutter%20install/17.jpg)

![image.png](./img/flutter%20install/18.jpg)

![image.png](./img/flutter%20install/19.jpg)

> 基本的flutter项目目录 ,但是我们使用android-studio 重新打开这个项目下的android 目录,才会有调试的功能
![image.png](./img/flutter%20install/20.jpg)
> 这里再打开android 目录后,android-studio 会下载 Gradle 过程有点慢,等它下载完成
![image.png](./img/flutter%20install/21.jpg)


> 只有它下载完成,才会有调试的功能,没有下载完成时,这些按钮都是灰色的
![image.png](./img/flutter%20install/22.jpg)
![image.png](./img/flutter%20install/23.jpg)


### 8. VS code 开发插件安装
![image.png](./img/flutter%20install/24.jpg)

![image.png](./img/flutter%20install/25.jpg)

![image.png](./img/flutter%20install/26.jpg)


## Fluter 项目运行
``` 
    flutter create flutter02<项目名称>   //创建flutter项目
    flutter create --platforms=android,ios <project_name>  //指定平台生成flutter项目

    flutter devices   //查看当前支持的运行终端
    flutter run   //运行当前项目
    flutter run  -d  android    //指定android平台运行

    flutter build apk    //打包项目成apk文件
```

![image.png](./img/flutter%20install/27.jpg)

![image.png](./img/flutter%20install/28.jpg)

![image.png](./img/flutter%20install/29.jpg)
```
在运行时通过热键进行调试命令:

r Hot reload.    //点击后热加载,重新加载
R Hot restart.   // 热重启项目
h List all available interactive commands.
p       //显示所有元素节点网格
d Detach (terminate "flutter run" but leave application running).  
c Clear the screen   //切换android与ios 中的预览模式,项目支持多平台会一次切换多个平台
q Quit (terminate the application on the device).   //退出项目调试
```

```
最后android build发包时需要的签名文件

keytool -genkeypair \
  -alias my-release-key \          # 别名（自定义）
  -keyalg RSA \                    # 密钥算法（RSA）
  -keysize 2048 \                  # 密钥长度（2048 位）
  -validity 36500 \                # 有效期（约 100 年）
  -keystore ./my-release-key.p12 \ # 存储路径（PKCS12 格式，推荐）
  -storetype PKCS12 \              # 存储类型（PKCS12 是跨平台标准）
  -storepass 123456 \              # Keystore 密码（自定义）
  -dname "CN=张三, OU=开发部, O=我的公司, L=北京, ST=北京, C=中国"  # 证书信息（自定义）

cmd运行
  keytool -genkeypair ^
  -alias my-release-key ^
  -keyalg RSA ^
  -keysize 2048 ^
  -validity 36500 ^
  -keystore .\my-release-key.p12 ^
  -storetype PKCS12 ^
  -storepass 123456 ^
  -dname "CN=张三, OU=开发部, O=我的公司, L=北京, ST=北京, C=中国"
  
  验证 Keystore 是否生成成功
  keytool -list -v -keystore ./my-release-key.p12 -storetype PKCS12 -storepass 123456
```

