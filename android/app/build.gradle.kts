import java.util.Properties

plugins {
    id("com.android.application")
}

val host = providers.gradleProperty("twaHost").get()
val path = providers.gradleProperty("twaPath").get()
val startUrl = "https://$host$path"

val keystoreProps = Properties().apply {
    val f = rootProject.file("keystore.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

// Escapa comillas para meter JSON dentro de un recurso <string>
fun res(json: String) = json.replace("\"", "\\\"")

android {
    namespace = "app.rincon.lectura"
    compileSdk = 36

    defaultConfig {
        applicationId = "app.rincon.lectura"
        minSdk = 23
        targetSdk = 36
        versionCode = providers.gradleProperty("apkVersionCode").get().toInt()
        versionName = providers.gradleProperty("apkVersionName").get()

        manifestPlaceholders["hostName"] = host
        manifestPlaceholders["defaultUrl"] = startUrl

        // Vínculo con la web (assetlinks.json): así se abre a pantalla completa, sin barra del navegador
        resValue("string", "asset_statements", res(
            """[{"relation": ["delegate_permission/common.handle_all_urls"], "target": {"namespace": "web", "site": "https://$host"}}]"""))

        // Menú Compartir (Telegram, Archivos...): reenvía el archivo al share_target de la web
        resValue("string", "share_target", res(
            """{"action": "${startUrl}share-target", "method": "POST", "enctype": "multipart/form-data", "params": {"title": "title", "text": "text", "files": [{"name": "books", "accept": ["application/epub+zip", ".epub", "application/pdf", ".pdf", "application/octet-stream"]}]}}"""))
    }

    buildFeatures { resValues = true }

    signingConfigs {
        create("release") {
            if (keystoreProps.isNotEmpty()) {
                storeFile = rootProject.file(keystoreProps.getProperty("storeFile"))
                storePassword = keystoreProps.getProperty("storePassword")
                keyAlias = keystoreProps.getProperty("keyAlias")
                keyPassword = keystoreProps.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
    }
}

dependencies {
    implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.6.2")
}
