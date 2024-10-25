using System;

using Android.App;
using Android.Content.PM;
using Android.Runtime;
using Android.Views;
using Android.Widget;
using Android.OS;

namespace EvaCalculator.Droid
{
    [Activity(Label = "eCalcule", Icon = "@drawable/iconoEvaIV", Theme = "@style/MyTheme.Splash", MainLauncher = true, ConfigurationChanges = ConfigChanges.ScreenSize | ConfigChanges.Orientation, ScreenOrientation = ScreenOrientation.Portrait)]
    public class MainActivity : global::Xamarin.Forms.Platform.Android.FormsAppCompatActivity
    {
        protected override void OnCreate(Bundle bundle)
        {
            TabLayoutResource = Resource.Layout.Tabbar;
            ToolbarResource = Resource.Layout.Toolbar;

            base.OnCreate(bundle);

            global::Xamarin.Forms.Forms.Init(this, bundle);
            LoadApplication(new App());
        }

        /*Código para controlar el Back Button---------------------------------------------------------->*/
        #region La App se cierra con dos toques del back button ->
        long lastPress; string presiona;
        public override void OnBackPressed()
        {
            #region Cargar Idioma ->
            if(SaveAndGet.Helpers.Settings.IdiomA == "Español" || SaveAndGet.Helpers.Settings.IdiomA == "Spanish")
            {
                presiona = "Presiona una vez más para salir";
            }
            else if (SaveAndGet.Helpers.Settings.IdiomA == "Inglés" || SaveAndGet.Helpers.Settings.IdiomA == "English")
            {
                presiona = "Press <Back> once more to exit";
            }
            #endregion

            long currentTime = DateTime.UtcNow.Ticks / TimeSpan.TicksPerMillisecond;

            if (currentTime - lastPress > 3000)
            {
                Toast.MakeText(this, presiona, ToastLength.Short).Show();
                lastPress = currentTime;
            }
            else
            {
                base.OnBackPressed();
            }
        }
        #endregion
        /*---------------------------------------------------------------------------------------------->*/
    }
}

