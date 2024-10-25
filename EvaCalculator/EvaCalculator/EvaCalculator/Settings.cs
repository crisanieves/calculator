// Helpers/Settings.cs
using Plugin.Settings;
using Plugin.Settings.Abstractions;

namespace SaveAndGet.Helpers
{
  /// <summary>
  /// This is the Settings static class that can be used in your Core solution or in any
  /// of your client applications. All settings are laid out the same exact way with getters
  /// and setters. 
  /// </summary>
  public static class Settings
  {
    private static ISettings AppSettings
    {
        get
        {
            return CrossSettings.Current;
        }
    }

    #region Setting Constants

    private const string XKey = "X_key";
    private const string YKey = "Y_key";
    private const string ZKey = "Z_key";
    private const string WKey = "W_key";
    private static readonly string SettingsDefault = string.Empty;

    private const string degreeKey = "degree_key";
    private static readonly string RADDefault = "RAD";

    private const string Idioma = "Idioma_key";
    private static readonly string IdiomaDefault = "Español";

    private const string CifrasKey = "cifras_key";
    private static readonly int intDefault = 10;

    private const string InfoKey = "Info_key";
    private static readonly bool boolDefault = true;


        #endregion

        public static string X
    {
        get
        {
            return AppSettings.GetValueOrDefault(XKey, SettingsDefault);
        }
        set
        {
            AppSettings.AddOrUpdateValue(XKey, value);
        }
    }

    public static string Y
    {
       get
       {
          return AppSettings.GetValueOrDefault(YKey, SettingsDefault);
       }
       set
       {
          AppSettings.AddOrUpdateValue(YKey, value);
       }
    }
        public static string Z
        {
            get
            {
                return AppSettings.GetValueOrDefault(ZKey, SettingsDefault);
            }
            set
            {
                AppSettings.AddOrUpdateValue(ZKey, value);
            }
        }

        public static string W
        {
            get
            {
                return AppSettings.GetValueOrDefault(WKey, SettingsDefault);
            }
            set
            {
                AppSettings.AddOrUpdateValue(WKey, value);
            }
        }


        public static string RaDeGree
        {
            get
            {
                return AppSettings.GetValueOrDefault(degreeKey, RADDefault);
            }
            set
            {
                AppSettings.AddOrUpdateValue(degreeKey, value);
            }
        }


        public static string IdiomA
        {
            get
            {
                return AppSettings.GetValueOrDefault(Idioma, IdiomaDefault);
            }
            set
            {
                AppSettings.AddOrUpdateValue(Idioma, value);
            }
        }



        public static int No_Decimales
        {
            get
            {
                return AppSettings.GetValueOrDefault(CifrasKey, intDefault);
            }
            set
            {
                AppSettings.AddOrUpdateValue(CifrasKey, value);
            }
        }

        public static bool MostrarInfo
        {
            get
            {
                return AppSettings.GetValueOrDefault(InfoKey, boolDefault);
            }
            set
            {
                AppSettings.AddOrUpdateValue(InfoKey, value);
            }
        }

    }

}
