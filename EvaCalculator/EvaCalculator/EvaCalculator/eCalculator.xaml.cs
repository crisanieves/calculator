using System;
using System.Linq;
using Xamarin.Forms;
using SaveAndGet.Helpers;
using Android.Widget;

namespace EvaCalculator
{
	public partial class MainPage : ContentPage
    {   
        #region Variables Globales->
        private int AnyOperador = 0, CantidadNumeros = 0, CantidadTemporal, NoEraseUNO;
        private double Indice, resultadoRaiz; private string ResultadoRaiz; private bool HacerRaizGeneral, OneTime, OneTimeI, DatoGuardado, VarialSaved;
        private string[] RAM = new string[20]; private int MaxRAM = 20, NoCasilla = 0;
        private uint RAMPreset; private int NoDecimales;
        private string[] SplitResult;
        private string temp, Numeros, Variables, AdmitSubtraction, NotAdmitSave, SpecialCharacters, nPotYFracc, nPot, LastDigito, LastCharacters, Varial;
        private string Flotante = ",", PuntoYComaSymbol = ";",
                       ProductSymbol = "×", divisionSymbol = "÷", // "³" "¹⁻¹"
                       piSymbol = "π", piNumber = "(3.14159265358979323846)",
                       eulerSymbol = "e", eulerNumber = "(2.718281828459045235360)",
                       EXPSymbol = "ε", EXPExpresion = "*10^";
        #endregion ---------------->

        #region Variables para idiomas ->
        private string Ayuda, Idioma, Cifras_Decimales, Acerca, Lenguaje, Language, Presicion, AyudaText, AcercaDeEva, Agradecimientos;
        private string Recuerda, InfoText, SiButton;
        private string Recuperar, Guardar_en, SetMessUno, SetMessDos, SetMess_Dos, SetMessTres;
        private string EligeUnaOpción, Cancelar, MensajeCero, MensajeInfinito;
        private string SysErrorTitle, SysErrorMess, EstaBienMess, Imposible, ButtonMessage;
        #endregion

        public MainPage()
        {
            InitializeComponent();

            #region valores por defecto ->
            Numeros = "0123456789"; Variables = "xyzw"; SpecialCharacters = "+-/,*sinɳŋċcostarh()ª√log@μ"; nPotYFracc = "¹½⅓¼⅛²⅔⅜³¾⁴⅝⅞"; nPot = "¹²³⁴";
            AdmitSubtraction = "^²/()%" + " " + divisionSymbol + EXPSymbol + ProductSymbol + piSymbol + eulerSymbol + Variables; NotAdmitSave = "+-/*×÷,(^ε";


            Retornar.IsVisible = false;
            HacerRaizGeneral = false;
            OneTime = false; DatoGuardado = false; VarialSaved = false;           
            #endregion ------------------>

            //Settings.X = null; Settings.Y = null; Settings.Z = null; Settings.W = null; //para borrar datos
            //Settings.RaDeGree = null; Settings.No_Decimales = 10;
            //Settings.MostrarInfo = true; Settings.IdiomA = null;
            #region Carga de datos guardados ->
            if (string.IsNullOrEmpty(Settings.X) && string.IsNullOrEmpty(Settings.Y) && string.IsNullOrEmpty(Settings.Z) && string.IsNullOrEmpty(Settings.W))
            {
                GetData.IsVisible = false;             
            }
            if (string.IsNullOrEmpty(Settings.X))
                Xv.IsVisible = false;
           // if (string.IsNullOrEmpty(Settings.Y))
                Yv.IsVisible = false;

            RadDegree.Text = Settings.RaDeGree;
            NoDecimales = Settings.No_Decimales;
            #endregion ----------------------->
            
            Inicio();
		}

        private void Inicio()
        {
            #region MathEnter Focus
            MathEnter.Focused += MathEnter_Focused;
            MathEnter.Unfocused += MathEnter_Unfocused;
            MathEnter.TextChanged += MathEnter_TextChanged;
            #endregion
            #region Gestures
            #region Logo EvaButton Gesture
            TapGestureRecognizer tapEvent = new TapGestureRecognizer();
                tapEvent.Tapped += EvaButton_Clicked;
                    EvaButton.GestureRecognizers.Add(tapEvent);
            #endregion
            #region MathResult Gesture Un Tap
            TapGestureRecognizer MathResultAddTo = new TapGestureRecognizer();
                MathResultAddTo.Tapped += MathResultAdd_Clicked;
                    MathResult.GestureRecognizers.Add(MathResultAddTo);
            #endregion
            #region MathResult Gesture Dos Tap
            TapGestureRecognizer MathResultEvent = new TapGestureRecognizer {
            Command = new Command(() => {}),  NumberOfTapsRequired = 2      };
                        MathResultEvent.Tapped += MathResultUP_Clicked;
                                MathResult.GestureRecognizers.Add(MathResultEvent);
            #endregion

            #endregion
            #region Botones  

                #region RadDegrees
                RadDegree.Clicked += RadDegree_Clicked;
                #endregion

                #region Guardar y recuperar
                Xv.Clicked += Xv_Clicked;
                Yv.Clicked += Yv_Clicked;
                GetData.Clicked += GetData_Clicked;
                SaveData.Clicked += SaveData_Clicked;              
                #endregion

                #region Igual, Coma flotante, EXP, AC, DEL
            DEL.Clicked += DEL_Clicked;
                AC.Clicked += AC_Clicked;
                EXP.Clicked += EXP_Clicked;
                comaFlotante.Clicked += ComaFlotante_Clicked;
                Igual.Clicked += Igual_Clicked;
                #endregion
                #region Linea de simbolos 3: Funciones
                    Logaritmo.Clicked += Logaritmo_Clicked;
                    logaritmoNatural.Clicked += LogaritmoNatural_Clicked;
                    seno.Clicked += Seno_Clicked;
                    coseno.Clicked += Coseno_Clicked;
                    tangente.Clicked += Tangente_Clicked;
                    Retornar.Clicked += Retornar_Clicked;
            #endregion
                #region Línea de símbolos 2
                    MoreButtons.Clicked += MoreButtons_Clicked;
                    nPotencia.Clicked += AnyPotencia_Clicked;
                    Factorial.Clicked += Factorial_Clicked;
                    RaizGeneral.Clicked += RaizGeneral_Clicked;
                    #region Números Irracioneles        
                    euler.Clicked += Euler_Clicked;
                    pi.Clicked += Pi_Clicked;
            #endregion
                #endregion
                #region Línea de símbolos 1
                    PuntoYComa.Clicked += PuntoYComa_Clicked;
                    PotenciaCuadrada.Clicked += PotenciaCuadrada_Clicked;
                    Porcentaje.Clicked += Porcentaje_Clicked;
                    RaizCuadrada.Clicked += RaizCuadrada_Clicked;
                    ParentesisApertura.Clicked += ParentesisApertura_Clicked;
                    ParentesisCierre.Clicked += ParentesisCierre_Clicked;
            #endregion
                #region Operaciones básicas
                Adicion.Clicked += Adicion_Clicked;
                Substraccion.Clicked += Substraccion_Clicked;
                Producto.Clicked += Producto_Clicked;
                Division.Clicked += Division_Clicked;
                #endregion
                #region Números
                Cero.Clicked += Cero_Clicked;
                Uno.Clicked += Uno_Clicked;
                Dos.Clicked += Dos_Clicked;
                Tres.Clicked += Tres_Clicked;
                Cuatro.Clicked += Cuatro_Clicked;
                Cinco.Clicked += Cinco_Clicked;
                Seis.Clicked += Seis_Clicked;
                Siete.Clicked += Siete_Clicked;
                Ocho.Clicked += Ocho_Clicked;
                Nueve.Clicked += Nueve_Clicked;
            #endregion

            #endregion          
        }

        private void ReemplazarVariables()
        {
            temp = temp.Replace("x", "(" + Settings.X + ")").Replace("y", "(" + Settings.Y + ")").Replace("z", "(" + Settings.Z + ")").Replace("w", "(" + Settings.W + ")")
                       .Replace("x", "(" + Settings.X + ")").Replace("y", "(" + Settings.Y + ")").Replace("z", "(" + Settings.Z + ")").Replace("w", "(" + Settings.W + ")")
                       .Replace("x", "(" + Settings.X + ")").Replace("y", "(" + Settings.Y + ")").Replace("z", "(" + Settings.Z + ")").Replace("w", "(" + Settings.W + ")")
                       .Replace("x", "(" + Settings.X + ")").Replace("y", "(" + Settings.Y + ")").Replace("z", "(" + Settings.Z + ")").Replace("w", "(" + Settings.W + ")")
                       .Replace("√", "sqrt").Replace("ªsqrt", "ª√");
        }
        private void ReemplazarFunciones()
        {
            /* REEMPLAZA FUNCIONES según el Modo DEG o RAD -------------------------------------------------------------*/
            if (RadDegree.Text == "DEG")
            {
                temp = temp.Replace("sin", "siɳ").Replace("cos", "ċos")
                           .Replace("ctan", "ctaŋ").Replace("an", "aɳ");
            }

            else if (RadDegree.Text == "RAD")
            { temp = temp.Replace("ɳ", "n").Replace("ŋ", "n").Replace("ċos", "cos"); }
            /*----------------------------------------------------------------------------------------------------------*/

        }
        private void ReemplazarSimbolos()
        {
            #region Reemplazando Símbolos ->
            if (HacerRaizGeneral == false)
            {
                /*-------------------------------------Reemplazando símbolos --------------------------------------*/
                temp = temp.Replace(ProductSymbol, "*").Replace(divisionSymbol, "/").Replace("%", "/100")
                           .Replace("-sin(", "-1*sin(").Replace("-cos(", "-1*cos(").Replace("-tan(", "-1*tan(")
                           .Replace("-siɳ(", "-1*siɳ(").Replace("-ċos(", "-1*ċos(").Replace("-taɳ(", "-1*taɳ(")
                           .Replace(Flotante, ".").Replace(PuntoYComaSymbol, ",").Replace(piSymbol, piNumber)
                           .Replace(eulerSymbol, eulerNumber).Replace(EXPSymbol, EXPExpresion)
                           .Replace("½", "+0.5").Replace("⅓", "+0.33333333").Replace("¼", "+0.25")
                           .Replace("⅛", "+0.125").Replace("⅔", "+0.66666667").Replace("⅜", "+0.375")
                           .Replace("¾", "+0.75").Replace("⅝", "+0.625").Replace("⅞", "+0.875")
                           .Replace("¹", "^(1)").Replace("²", "^(2)").Replace("³", "^(3)")
                           .Replace("⁴", "^(4)").Replace("μ", "*10^-6");
            }  //""
            else
            {
                LastCharacters = LastCharacters.Replace(ProductSymbol, "*").Replace(divisionSymbol, "/").Replace("%", "/100")
                           .Replace("-sin(", "-1*sin(").Replace("-cos(", "-1*cos(").Replace("-tan(", "-1*tan(")
                           .Replace("-siɳ(", "-1*siɳ(").Replace("-ċos(", "-1*ċos(").Replace("-taɳ(", "-1*taɳ(")
                           .Replace(Flotante, ".").Replace(PuntoYComaSymbol, ",").Replace(piSymbol, piNumber)
                           .Replace(eulerSymbol, eulerNumber).Replace(EXPSymbol, EXPExpresion)
                           .Replace("½", "+0.5").Replace("⅓", "+0.33333333").Replace("¼", "+0.25")
                           .Replace("⅛", "+0.125").Replace("⅔", "+0.66666667").Replace("⅜", "+0.375")
                           .Replace("¾", "+0.75").Replace("⅝", "+0.625").Replace("⅞", "+0.875")
                           .Replace("¹", "^(1)").Replace("²", "^(2)").Replace("³", "^(3)")
                           .Replace("⁴", "^(4)").Replace("μ", "*10^-6");


            }

            /*-------------------------------------------------------------------------------------------------*/
            #endregion
        }
        private void Igual_Clicked(object sender, EventArgs e)
        {
          if (MathEnter.Text.Contains("ª√(")) { HacerRaizGeneral = true; }

          Varial = MathEnter.Text;

          while (HacerRaizGeneral == true){ ParentesisCierre_Clicked(sender, e); }

          temp = MathEnter.Text; TemporalMemory(); MathEnter.Text = Varial;
          ReemplazarVariables(); ReemplazarFunciones();  ReemplazarSimbolos();

          try { LastDigito = temp.Last().ToString(); } catch { MathEnter.Text = " "; }

          if (Numeros.Contains(LastDigito) || LastDigito == ")")
          {
                RevisarParentesis();

                    try
                    {   /* Declarando y usando "MathosParser": */
                        var engine = new Mathos.Parser.MathParser();
                            double result = engine.Parse(temp.ToString());
                                result = Math.Round( result, NoDecimales, MidpointRounding.ToEven );
                                    temp = result.ToString();
                                        temp = temp.Replace(".", Flotante).Replace("E", EXPSymbol);

                                            if (MathResult.Text == temp && MathResult.Text != "NaN") {  IgualMessage();  } else {}

                                                    MathResult.Text = temp.ToString();


                        if (temp.Contains("Infinit") || temp == "NaN")
                        {
                            #region Cargar Idioma
                            if (Settings.IdiomA == "Español" || Settings.IdiomA == "Spanish")
                            {
                                MensajeCero = "La solución matemática, de cero entre cero, no tiene una respuesta correcta o no está definida: el resultado de la expresión suele interpretarse como cero. Tambien puede ser interpretado como un valor que tiende a infinito.";
                                MensajeInfinito = "Es posible que el resultado tienda a infinito por una división entre cero o un número que tiende a cero.";
                            }
                            else if (Settings.IdiomA == "Inglés" || Settings.IdiomA == "English")
                            {
                                MensajeCero = "The math solution, from zero divided by zero, does not have a correct answer or is not defined: the result of the expression is usually interpreted as zero. It can also be interpreted as a value that tends to infinite.";
                                MensajeInfinito = "It is possible result tends to infinity by a division by zero or a number that tends to zero.";
                            }
                            #endregion
                            MathResult.HorizontalTextAlignment = TextAlignment.Center;

                            if (temp == "NaN")
                            {                             
                                if ((MathEnter.Text == ("0" + divisionSymbol + "0") || MathEnter.Text == ("0" + divisionSymbol + "(0)") || MathEnter.Text == ("(0" + divisionSymbol + "0)") || MathEnter.Text == ("0/0") || MathEnter.Text == ("(0/0)") || MathEnter.Text.Contains("(0)/(0)") || MathEnter.Text.Contains("(0)" + divisionSymbol + "(0)")))
                                { DisplayActionSheet(null, null, null, MensajeCero); }
                            }
                            else if (temp.Contains("Infinit"))
                            {                             
                                if ((MathEnter.Text.Contains(divisionSymbol + "0") || MathEnter.Text.Contains("/0") || MathEnter.Text.Contains(divisionSymbol + "(0") || MathEnter.Text.Contains("/(0")) && (!MathEnter.Text.Contains("(0)/") && !MathEnter.Text.Contains("(0)" + divisionSymbol)))
                                { DisplayActionSheet(null, null, null, MensajeInfinito); }
                            }
                        }
                        else { MathResult.HorizontalTextAlignment = TextAlignment.End; }

                    }
                    catch
                    { MathResult.HorizontalTextAlignment = TextAlignment.Center; MathResult.Text = "Math Error"; }
                
          }
          else { if (OneTime == false) { MensajeSys(); } MathResult.HorizontalTextAlignment = TextAlignment.Center; MathResult.Text = "Sys Error"; }
                      
        }
        private void RadDegree_Clicked(object sender, EventArgs e)
        {
            ModoRadOrDeg();

            SuprimirEspacio();
            if ( (MathEnter.Text.Contains("s") || MathEnter.Text.Contains("a") 
                || ( MathEnter.Text.Contains("x") && (Settings.X.Contains("s") || Settings.X.Contains("a")) ) 
                || ( MathEnter.Text.Contains("y") && (Settings.Y.Contains("s") || Settings.Y.Contains("a")) ) 
                || ( MathEnter.Text.Contains("z") && (Settings.Z.Contains("s") || Settings.Z.Contains("a")) ) 
                || ( MathEnter.Text.Contains("w") && (Settings.W.Contains("s") || Settings.W.Contains("a")) ) )
                && (Numeros.Contains(LastDigito) || nPotYFracc.Contains(LastDigito) || Variables.Contains(LastDigito) || LastDigito == ")") )
                Igual_Clicked(sender, e);
            else { }
        }

        #region MathEnter Focus
        private void MathEnter_Focused(object sender, FocusEventArgs e)
        {
            SuprimirEspacio();
            MathEnter.Text = temp.Replace("Infinity", "").Replace("Infinito", "").Replace("NaN", "");
            MathEnter.Keyboard = Keyboard.Create(KeyboardFlags.None);
        }
        private void MathEnter_Unfocused(object sender, FocusEventArgs e)
        {
            /* Mayúsculas a minúsculas y remplazos de caracteres iniciales:->*/
            MathEnter.Text = MathEnter.Text.Replace("E", EXPSymbol).Replace("£", EXPSymbol);
            MathEnter.Text = MathEnter.Text.ToLower().Replace(" ","").Replace(".", Flotante).Replace("›", "^").Replace("‹", "^").Replace("«", "^").Replace("»", "^")
                                                     .Replace(">", "^").Replace("<", "^").Replace("°", "ª").Replace("'", "ª").Replace(":", "ª").Replace("[", "(")
                                                     .Replace("]",")").Replace("{","(").Replace("}", ")").Replace("•", "×").Replace("*", "×").Replace("—","-").Replace("–", "-").Replace("_", "-")
                                                     .Replace(")ª", "ª").Replace("+ª", "+ ª").Replace("-ª", "- ª")
                                                     .Replace("*ª", "* ª").Replace("×ª", "× ª").Replace("/ª", "/ ª").Replace("÷ª", "÷ ª")
                                                     .Replace("(ª", "( ª").Replace("xª", "x× ª").Replace("yª", "y× ª").Replace("zª", "z× ª").Replace("wª", "w× ª").Replace("eª", "e× ª").Replace("πª", "π× ª")
                                                     .Replace("^(1)", "").Replace("^(2)", "²").Replace("^(3)", "³").Replace("^(4)", "⁴");

            
            //*********************************Suprimir "Enter"************************************************************************************************
            SuprimirEspacio();
            while 
            ( (!Numeros.Contains(LastDigito)) && (!Variables.Contains(LastDigito)) && 
               !AdmitSubtraction.Contains(LastDigito) && !SpecialCharacters.Contains(LastDigito) && !nPotYFracc.Contains(LastDigito) )
            { MathEnter.Text = MathEnter.Text.Remove(MathEnter.Text.Length - 1);
              temp = MathEnter.Text;  SuprimirEspacio();
            }
            //**************************Termina control de escritura de raices***************************************************************
            MathEnter.Text = temp.Replace("ª√(", "&").Replace("ª√", "&").Replace("ª", "&").Replace("ª(", "&").Replace("&", "ª√(")
                                 .Replace("√(", "#").Replace("√", "√(").Replace("#", "√(");

            temp = MathEnter.Text;
            //**************************Controlar la Raíz General*****************************************************************************
            if (temp.Contains("ª√("))
            { HacerRaizGeneral = true; }
            else
            { HacerRaizGeneral = false; }

            //**************************Controlar escritura de funciones trigonométricas******************************************************
            #region Escritura de funciones ->
            MathEnter.Text = temp.Replace("arc", "æ")

                                 .Replace("sh(", "sh").Replace("ch(", "ch").Replace("th(", "th")
                                 .Replace("sinh(", "sh").Replace("cosh(", "ch").Replace("tanh(", "th")
                                 .Replace("sinh", "sh").Replace("cosh", "ch").Replace("tanh", "th")                               
                                 .Replace("sh", "$#").Replace("ch", "č#").Replace("th", "¥#")

                                 .Replace("s(", "s").Replace("c(", "c").Replace("t(", "t")
                                 .Replace("sin(", "s").Replace("cos(", "c").Replace("tan(", "t")
                                 .Replace("sin", "s").Replace("cos", "c").Replace("tan", "t")                      
                                 .Replace("s", "$(").Replace("c", "č(").Replace("t", "¥(")
                                                                                           
                                 .Replace("a", "arc").Replace("@", "arc").Replace("æ", "arc")

                                 .Replace("$(", "sin(").Replace("č(", "cos(").Replace("¥(", "tan(")
                                 .Replace("$#", "sinh(").Replace("č#", "cosh(").Replace("¥#", "tanh(");
            #endregion
            /*------------------------------------------------------------------------------------------------------------------------------*/

            //*******************************************************************************************
            CargarVariablesConRaizGeneral();
            //*******************************************************************************************

            if (Numeros.Contains(LastDigito) || LastDigito==")" || LastDigito == piSymbol || LastDigito == eulerSymbol
                || Variables.Contains(LastDigito) || nPotYFracc.Contains(LastDigito) )
            { Igual_Clicked(sender, e); }
            else { }
            
        }
        private void MathEnter_TextChanged(object sender, TextChangedEventArgs e)
        {
            if (MathEnter.IsFocused)
            {
                /*  MathEnter.Text = MathEnter.Text.Replace("¡", "").Replace("!", "").Replace("$", "")
                                   .Replace("&", "h").Replace("¿", "").Replace("?", "").Replace("=", "").Replace("#", "")
                                   .Replace("_", "")
                                   .Replace("=", "").Replace(".", ",").Replace("@", "arccos(").Replace("´", "").Replace("`", "")
                                   .Replace("|", "").Replace("°", "").Replace("ç", "cos(").Replace("©", "arccosh(").Replace("{", "")
                                   .Replace("}", "").Replace("Π", ""); */

                char[] separators = new char[]
                { '¡','!','$','&','¿','?','=','#','.','´','`','|',
                  'Π','Ω','€','₡','₲','€','¢','¥','₱','∅','ⁿ','№','±','~','¶','∆',
                  '©','®','™','✓','ñ','ñ','ń','ß','ñ','ñ','ń','ß','…','„','“','”','’','ç','ć','č',
                  'à','á','â','ä','æ','ã','å','ā','ą','ę','ë','ē','ė','è','é','ê' };
                string[] sss = MathEnter.Text.Split(separators, StringSplitOptions.RemoveEmptyEntries);
                MathEnter.Text = String.Join("", sss); 
            }

        }
        #endregion

        #region Guardar y recuperar
        private void Yv_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio(); SuprimirInfinity();
           /* if (Numeros.Contains(LastDigito))
            {
                MathEnter.Text = MathEnter.Text + ProductSymbol;
            } */

            if (LastDigito != Flotante)
            {
                temp = MathEnter.Text + "y"; MathEnter.Text = temp;
                Contar();
            }
            else { }
        }
        private void Xv_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio(); SuprimirInfinity();
           /* if (Numeros.Contains(LastDigito))
            {
                MathEnter.Text = MathEnter.Text + ProductSymbol;
            } */

            if (LastDigito != Flotante)
            {
                temp = MathEnter.Text + "x"; MathEnter.Text = temp;
                Contar();
            }
            else { }

            if (MathEnter.Text.Contains("x") && Settings.X.Contains("ª√("))
            {
                HacerRaizGeneral = true; MathEnter.Text = MathEnter.Text.Replace("x", Settings.X);
            }
        }
        private async void GetData_Clicked(object sender, EventArgs e)
        {
            #region Cargar idioma->
            if (Settings.IdiomA == "Español" || Settings.IdiomA == "Spanish")
            {
                Recuperar = "Recuperar...";
            }
            else if (Settings.IdiomA == "Inglés" || Settings.IdiomA == "English")
            {
                Recuperar = "Get from...";
            }
            #endregion

            SuprimirEspacio();
            var variable = await DisplayActionSheet(Recuperar, null, null, "x", "y", "z", "w");

            if (variable == "x") MathEnter.Text = Settings.X;
            else if (variable == "y") MathEnter.Text = Settings.Y;
            else if (variable == "z") MathEnter.Text = Settings.Z;
            else if (variable == "w") MathEnter.Text = Settings.W;
            else { }

        }
        private async void SaveData_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio(); 
            if ( !(string.IsNullOrWhiteSpace(MathEnter.Text)) && (!NotAdmitSave.Contains(LastDigito)) )
            {
                Igual_Clicked(sender, e);
                if ( ( !string.IsNullOrWhiteSpace(MathResult.Text) && !MathResult.Text.Contains("Error") && !MathResult.Text.Contains("NaN") ) )
                {
                    #region Cargar idioma
                    if (Settings.IdiomA == "Español" || Settings.IdiomA == "Spanish")
                    {
                        Guardar_en = "Guardar en..."; SetMessUno = "Guardado en ";
                        SetMessDos = "No es posible guardar la variable "; SetMess_Dos = " sobre sí misma.";
                        SetMessTres = "El dato ya está guardado en la variable ";
                    }
                    else if (Settings.IdiomA == "Inglés" || Settings.IdiomA == "English")
                    {
                        Guardar_en = "Set to..."; SetMessUno = "Saved in ";
                        SetMessDos = "It is not possible to save the variable "; SetMess_Dos = " about itself.";
                        SetMessTres = "Data is already saved in the variable ";
                    }
                    #endregion

                    #region Preparar datos para ser guardados ->
                    if (MathEnter.Text.Contains("ª√"))
                    {
                        while (MathEnter.Text.Last().ToString() == ")")
                        {
                            int NumeroDeCaracteres = MathEnter.Text.Length;
                            MathEnter.Text = MathEnter.Text.Remove(NumeroDeCaracteres - 1);
                        }

                    }
                    else {}
                    #endregion

                    #region Verifica si el dato ya está guardado o no ->
                    if (Settings.X == MathEnter.Text)
                    { Varial = "x"; VarialSaved = true; }
                    else if (Settings.Y == MathEnter.Text)
                    { Varial = "y"; VarialSaved = true; }
                    else if (Settings.Z == MathEnter.Text)
                    { Varial = "z"; VarialSaved = true; }
                    else if (Settings.W == MathEnter.Text)
                    { Varial = "w"; VarialSaved = true; }
                    else { Varial = " "; VarialSaved = false; }
                    #endregion

                    if (VarialSaved == false)
                    {
                        var variable = await DisplayActionSheet(Guardar_en, null, null, "x", "y", "z", "w");

                        if (!(string.IsNullOrWhiteSpace(variable)))
                        {
                            if (variable == "x")
                            {
                                if (!MathEnter.Text.Contains("x"))
                                { Settings.X = MathEnter.Text.ToString(); Xv.IsVisible = true; DatoGuardado = true; }
                                else { }
                            }
                            else if (variable == "y")
                            {
                                if (!MathEnter.Text.Contains("y"))
                                { Settings.Y = MathEnter.Text; DatoGuardado = true; /* Yv.IsVisible = true; */ }
                                else { }
                            }
                            else if (variable == "z")
                            {
                                if (!MathEnter.Text.Contains("z"))
                                { Settings.Z = MathEnter.Text; DatoGuardado = true; /* Zv.IsVisible = true; */ }
                                else { }
                            }
                            else if (variable == "w")
                            {
                                if (!MathEnter.Text.Contains("w"))
                                { Settings.W = MathEnter.Text; DatoGuardado = true; /* Wv.IsVisible = true; */ }
                                else { }
                            }
                            else { }

                            if (DatoGuardado == true)
                            {
                                GetData.IsVisible = true;
                                await DisplayActionSheet(null, null, null, SetMessUno + variable + ".");
                                DatoGuardado = false;
                            }
                            else
                            {
                                await DisplayActionSheet(null, null, null, SetMessDos + variable + SetMess_Dos);
                                //Toast.MakeText(Android.App.Application.Context, "No se puede guardar la variable", ToastLength.Long).Show();
                            }
                        }
                    }
                    else
                    {
                        await DisplayActionSheet(null, null, null, SetMessTres + Varial + ".");
                    }
                }
                else { CanNotSaveMessage(); }
            }
            else { ToastMessage(); }

        }

        #endregion    

        #region Gestures, EvaLogo...
        public async void EvaButton_Clicked(object sender, EventArgs e)
        {
            #region Carga de Idioma
            if (Settings.IdiomA == "Español" || Settings.IdiomA == "Spanish")
            {
                Ayuda = "Ayuda"; Idioma = "Idioma (Lenguaje)"; Cifras_Decimales = "Cifras decimales ("; Acerca = "Acerca de Eva Calculator";
                Lenguaje = "Español"; Language = "Inglés"; Presicion = "Precisión (";


                AyudaText = "\nToca la pantalla de resultados para subir un dato a la pantalla de entrada:\n1. Una vez para añadir.\n2. Dos veces para reemplazar.\n\n" +
                        "El botón <M> es una memoria temporal y cuando aparece podrás volver atrás para recuperar alguna ecuación. Dependiendo del dato, deberás tocar <M> una o dos veces.\n\n" +
                        "El botón <SET> permite guardar permanentemente una ecuación en cualquiera de las cuatro posiciones de memoria (x, y, z, w).\n\n" +
                        "El botón <GET> permite cargar un dato desde cualquiera de las cuatro posiciones de memoria. Este botón será visible sólo cuando haya algún dato que recuperar. Puedes utilizar los botones x, y, z, w para recuperar algunos tipos de datos sin tener que ver el dato almacenado en la pantalla.\n\n" +
                        "El botón <RAD/DEG>, modo RAD (radianes) o modo DEG (grados sexagesimales), te permite trabajar con las funciones trigonométricas de manera dinámica.\n\n" +
                        "Hay botones que presentan restricciones según el dato delante de él:\n" +
                        "1. El botón factorial <!> sólo funciona delante de un número entero.\n" +
                        "2. El botón <ª√> funciona delante de números enteros y decimales.\n\n" +
                        "Toca dos veces la pantalla de entrada para editar una ecuación: utiliza el teclado del teléfono. Ten en cuenta que muchos carácteres especiales no están soportados por la app.\n\n" +
                        "Recuerda:\n\nLas equivalencias logarítmicas...\nlog(a;b) = log[b](a) = ln(a)/ln(b) = log(a)/log(b)\n\n" +
                        "Los arcos son las funciones inversas de las funciones trigonométricas respectivas:\narcsin(α) = sin¯¹(α)\narccos(α) = cos¯¹(α)\narctan(α) = tan¯¹(α)\n\narcsinh(x) = sinh¯¹(x)\narccosh(x) = cosh¯¹(x); x >= 1\narctanh(x) = tanh¯¹(x); -1<x<1\n";


                AcercaDeEva = "Eva Calculator\nVersión 1.05\nGrupo EvaApps.\n" + "© 2018 Eva Corporation.\n" + "Todos los derechos reservados.\n\n" +
                              "Diseño y desarrollo:\nCristian A. Nieves";
                Agradecimientos = "Agradecimientos:\nMathos Project\n© 2018 Mathos Project. Todos los derechos reservados.";
            }
            else if (Settings.IdiomA == "Inglés" || Settings.IdiomA == "English")
            {
                Ayuda = "Help"; Idioma = "Language"; Cifras_Decimales = "Decimal places ("; Acerca = "About Eva Calculator";
                Lenguaje = "Spanish"; Language = "English"; Presicion = "Decimal places (";


                AyudaText = "\nTap the results screen to upload a data to the input screen:\n1. Once to add.\n2. Twice to replace.\n\n" +
                            "The <M> button is a temporary memory and when it appears you can go back to retrieve an equation. Depending on the data, you should touch <M> once or twice.\n\n" +
                            "The <SET> button allows you to permanently save an equation in any of the four memory locations (x, y, z, w).\n\n" +
                            "The <GET> button allows you to load a data from any of the four memory locations. This button will be visible only when there is some data to recover.You can use the x, y, z, w buttons to recover some types of data without having to see the data stored on the screen.\n\n" +
                            "The <RAD/DEG> button, RAD mode (radians) or DEG mode (degrees), allows you to work with trigonometric functions dynamically.\n\n" +
                            "There are buttons that have restrictions according to the data in front of it:\n" +
                            "1. The factorial button <!> only works in front of a integer number.\n" +
                            "2. The button <ª√> works in front of integer and decimal numbers.\n\n" +
                            "Double-tap the input screen to edit an equation: use the phone's keyboard. Keep in mind that many special characters are not supported by the app.\n\n" +
                            "Remember:\n\nThe logarithmic equivalences...\nlog(a;b) = log[b](a) = ln(a)/ln(b) = log(a)/log(b)\n\n" +
                            "The arcs are the inverse functions of the respective trigonometric functions:\narcsin(α) = sin¯¹(α)\narccos(α) = cos¯¹ (α)\narctan(α) = tan¯¹(α)\n\narcsinh(x) = sinh¯¹(x)\narccosh(x) = cosh¯¹(x); x >= 1\narctanh(x) = tanh¯¹(x); -1 <x<1\n ";


                AcercaDeEva = "Eva Calculator\nVersion 1.05\nEvaApps team.\n" + "© 2018 Eva Corporation.\n" + "All rights reserved.\n\n" +
                              "Design and development:\nCristian A. Nieves";
                Agradecimientos = "Acknowledgement:\nMathos Project\n© 2018 Mathos Project.\nAll rights reserved.";
            }
            #endregion

            var action = await DisplayActionSheet(null, null, null, Ayuda, Idioma, Cifras_Decimales + NoDecimales.ToString() + ")", Acerca);

            if (action != null)
            {
                if (action == Ayuda)
                {
                    await DisplayActionSheet( Ayuda, null, null, AyudaText);
                }     
                else if (action == Idioma)
                {
                    var Idioma = await DisplayActionSheet(null, null, null, Lenguaje, Language);

                    if( !string.IsNullOrEmpty(Idioma) ) { Settings.IdiomA = Idioma; } else {}
                }
                else if (action.Contains(Cifras_Decimales))
                {
                    var cifras = await DisplayActionSheet(Presicion + NoDecimales.ToString() + ")", null, null, "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15");

                    if (!(string.IsNullOrEmpty(cifras)))
                    {
                        if (Int16.TryParse(cifras, out short Decimales))
                        {
                            NoDecimales = Decimales;
                            Settings.No_Decimales = Decimales;

                            SuprimirEspacio();
                            if (!(string.IsNullOrWhiteSpace(LastDigito)))
                            {
                                Igual_Clicked(sender, e);
                            }
                            else { MathEnter.Text = " "; } /* Por seguridad en la app.*/
                        }

                    }
                    else {}

                }
                else if (action == Acerca)
                {
                    await DisplayActionSheet("Eva Calculator", null, null, AcercaDeEva, Agradecimientos);
                }
                else { }
            }
        }
        private void MathResultAdd_Clicked(object sender, EventArgs e)
        {
            if (!MathResult.Text.Contains("Error") && !MathResult.Text.Contains("Infinit") && !MathResult.Text.Contains("NaN")
                && (!string.IsNullOrWhiteSpace(MathResult.Text)) )
            {
                TemporalMemory();
                SuprimirEspacio(); ProductAfterCharacter();

                if (Numeros.Contains(LastDigito))
                {
                    SplitResult = temp.Split(new char[] { '×', '+', '-', '÷', '/', '√', '^', '(', ';' }
                    , StringSplitOptions.RemoveEmptyEntries); LastCharacters = SplitResult.Last().ToString();

                    if (!LastCharacters.Contains(Flotante))
                    {
                        MathEnter.Text = MathEnter.Text + "×" + MathResult.Text;
                    }
                    else if (!MathResult.Text.Contains(Flotante))
                    {
                        MathEnter.Text = MathEnter.Text + "×" + MathResult.Text;
                    }
                    else { MathEnter.Text = MathEnter.Text + "×" + MathResult.Text; }
                }
                else if (LastDigito == "-")
                {
                    try { LastDigito = MathEnter.Text.Remove(MathEnter.Text.Length - 1).Last().ToString(); } catch { LastDigito = " "; }
                    if (LastDigito != ProductSymbol && LastDigito != divisionSymbol && LastDigito != "/" && LastDigito != " ")
                    {
                        if (MathResult.Text[0] == '-')
                        {
                            MathEnter.Text = MathEnter.Text.Remove(MathEnter.Text.Length - 1);
                            MathEnter.Text = MathEnter.Text + (MathResult.Text.Replace("ε-", "&").Replace("-", "+").Replace("&", "ε-"));
                        }
                        else { MathEnter.Text = MathEnter.Text + MathResult.Text; }
                    }
                    else
                    {
                        if (MathResult.Text[0] == '-')
                        {
                            MathEnter.Text = MathEnter.Text.Remove(MathEnter.Text.Length - 1);
                            MathEnter.Text = MathEnter.Text + (MathResult.Text.Replace("ε-", "&").Replace("-", "").Replace("&", "ε-"));
                        }
                        else { MathEnter.Text = MathEnter.Text + MathResult.Text; }

                    }

                }
                else if (LastDigito == "+")
                {
                    if (MathResult.Text[0] == '-')
                    {
                        MathEnter.Text = MathEnter.Text.Remove(MathEnter.Text.Length - 1);
                        MathEnter.Text = MathEnter.Text + MathResult.Text;
                    }
                    else { MathEnter.Text = MathEnter.Text + MathResult.Text; }
                }
                else if (LastDigito == Flotante && (MathResult.Text.Contains(Flotante) || MathResult.Text[0] == '-') )
                {
                    #region Cargar Idioma ->
                    if(Settings.IdiomA == "Español" || Settings.IdiomA == "Spanish")
                    {
                        Imposible = "Imposible realizar la acción.";
                    }
                    else if(Settings.IdiomA == "Inglés" || Settings.IdiomA == "English")
                    {
                        Imposible = "Not possible to perform the action.";
                    }
                    #endregion

                    DisplayActionSheet(null, null, null, Imposible);
                }
                else { MathEnter.Text = MathEnter.Text + MathResult.Text; }

            }
        }
        private void MathResultUP_Clicked(object sender, EventArgs e)
        {
            if ( !MathResult.Text.Contains("Error") && !MathResult.Text.Contains("Infinit")
                 && !MathResult.Text.Contains("NaN") && (!string.IsNullOrWhiteSpace(MathResult.Text)) )
            {
                TemporalMemory();
                MathEnter.Text = "" + MathResult.Text;
            }
        }
        #endregion

        #region Coma flotante y EXP
        private void ComaFlotante_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio(); SuprimirInfinity();

            if (Numeros.Contains(LastDigito))
            {
                SplitResult = temp.Split(new char[] { '×', '+', '-', '÷', '/', '√', '^', '(', ';'}
                , StringSplitOptions.RemoveEmptyEntries);   LastCharacters = SplitResult.Last().ToString();

                if (!LastCharacters.Contains(Flotante))
                {
                    temp = temp + Flotante; MathEnter.Text = temp;
                }
                else {}
            }
            else if (LastDigito == Flotante) {}
            else
                {
                    SuprimirEspacio(); ProductAfterCharacter();
                    temp = MathEnter.Text + "0,"; MathEnter.Text = temp;
                    CantidadNumeros = CantidadNumeros + 1;
                }
            
        }

        private void EXP_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio();

            if (Numeros.Contains(LastDigito) || LastDigito == "%" || LastDigito == ")" || nPotYFracc.Contains(LastDigito)
                || LastDigito == piSymbol || LastDigito == eulerSymbol)
            {
                temp = temp + EXPSymbol; MathEnter.Text = temp;
                AnyOperador = 1; CantidadTemporal = CantidadNumeros;
                Contar();
            }
            else { ToastMessage(); }
        }
        #endregion     

        #region  Borrar pantalla y volver atrás (retornar)

        private void AC_Clicked(object sender, EventArgs e)
        {
            TemporalMemory();

            if (!string.IsNullOrWhiteSpace(MathEnter.Text))
            {
                MathEnter.Text = " ";
                CantidadNumeros = 0;              
            }
            else { MathResult.Text = ""; }

            HacerRaizGeneral = false;
        }

        private void DEL_Clicked(object sender, EventArgs e)
        {            
          temp = MathEnter.Text; int NumeroDeCaracteres = temp.Length;
                    
             if (NumeroDeCaracteres <= 1)
             {
                 MathEnter.Text = " ";
                 CantidadNumeros = 0;
             }
             else
             {
                LastDigito = temp.Last().ToString();

                   SplitResult = temp.Split(new char[] { '(' });
                      LastCharacters = SplitResult.Last().ToString();

                      if (LastCharacters == "") //string.IsNullOrEmpty(LastCharacters)
                      {
                         temp = temp.Remove(NumeroDeCaracteres - 1);
                            SplitResult = temp.Split(new char[] { '(' });
                               LastCharacters = SplitResult.Last().ToString();
                                if (LastCharacters.Contains("arc") && LastCharacters.Contains("h"))
                                {
                                    MathEnter.Text = temp.Remove(NumeroDeCaracteres - 8);
                                }
                                else if (LastCharacters.Contains("arc"))
                                {
                                    MathEnter.Text = temp.Remove(NumeroDeCaracteres - 7);
                                }
                                else  if (LastCharacters.Contains("h"))
                                {
                                    MathEnter.Text = temp.Remove(NumeroDeCaracteres - 5);
                                }
                                else if (LastCharacters.Contains("in") || LastCharacters.Contains("ta") 
                                        || LastCharacters.Contains("s") || LastCharacters.Contains("g") 
                                        || LastCharacters.Contains("NaN"))
                                {
                                    MathEnter.Text = temp.Remove(NumeroDeCaracteres - 4);
                                }
                                else if (LastCharacters.Contains("ln") || LastCharacters.Contains("ª√"))
                                {
                                    MathEnter.Text = temp.Remove(NumeroDeCaracteres - 3);

                                    if (!MathEnter.Text.Contains("ª√"))
                                    { HacerRaizGeneral = false; } else {}
                                }
                                else if (LastCharacters.Contains("√"))
                                {
                                    MathEnter.Text = temp.Remove(NumeroDeCaracteres - 2);
                                }
                                else
                                {
                                    MathEnter.Text = temp;
                                } 
                      }
                      else if(LastCharacters.Contains("Inf") && (LastDigito == "y" || LastDigito == "o") )
                      { MathEnter.Text = temp.Remove(NumeroDeCaracteres - 8); }
                      else if (LastDigito == "N")
                      { MathEnter.Text = temp.Remove(NumeroDeCaracteres - 3); }
                      else
                      { MathEnter.Text = temp.Remove(NumeroDeCaracteres - 1); }         
                    
                  if(Numeros.Contains(LastDigito))
                  {
                     CantidadNumeros = CantidadNumeros - 1;
                  }
                  else if(LastDigito == Flotante){}

                  else
                  { 
                     CantidadNumeros = CantidadTemporal;
                  }
             }          
        }

        private void Retornar_Clicked(object sender, EventArgs e)
        {
            ChangeColor();

                MathEnter.Text = (RAM[NoCasilla - RAMPreset]);
                    RAMPreset = RAMPreset + 1;
                        if (RAMPreset > NoCasilla)
                        {   RAMPreset = 1;  }   else {}


             if(MathEnter.Text.Contains("ª√"))
             {
              HacerRaizGeneral = true;
              while(MathEnter.Text.Last().ToString() == ")")
              { MathEnter.Text = MathEnter.Text.Remove(MathEnter.Text.Length - 1); }    
             }
             else { HacerRaizGeneral = false; }
        }
        #endregion    

        #region Linea de simbolos 3: Funciones

        private async void MoreButtons_Clicked(object sender, EventArgs e)
        {
            #region Cargar idioma
            if(Settings.IdiomA == "Español" || Settings.IdiomA == "Spanish")
            {
                EligeUnaOpción = "Elige una opción:";
                Cancelar = "Cancelar";
            }
            else if(Settings.IdiomA == "Inglés" || Settings.IdiomA == "English")
            {
                EligeUnaOpción = "Choose an option:";
                Cancelar = "Cancel";
            }
            #endregion

            var action = await DisplayActionSheet(EligeUnaOpción, Cancelar, null, "sinh", "arcsin", "arcsinh",
                "cosh", "arccos", "arccosh", "tanh", "arctan", "arctanh");

            if ( action != Cancelar && action != null)
            {
                SuprimirEspacio(); SuprimirInfinity(); ProductAfterCharacter();
                if (LastDigito != Flotante)
                {
                    temp = MathEnter.Text + action + "("; MathEnter.Text = temp;
                    AnyOperador = 1; CantidadTemporal = CantidadNumeros;
                    Contar();
                }
               
            }

        }

        private void Logaritmo_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio(); SuprimirInfinity(); ProductAfterCharacter();
            if (LastDigito != Flotante)
            {
                temp = MathEnter.Text + "log("; MathEnter.Text = temp;
                AnyOperador = 1; CantidadTemporal = CantidadNumeros;
                Contar();
            }
        }

        private void LogaritmoNatural_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio(); SuprimirInfinity(); ProductAfterCharacter();
            if (LastDigito != Flotante)
            {
                temp = MathEnter.Text + "ln("; MathEnter.Text = temp;
                AnyOperador = 1; CantidadTemporal = CantidadNumeros;
                Contar();
            }
        }

        private void Seno_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio(); SuprimirInfinity(); ProductAfterCharacter();
            if (LastDigito != Flotante)
            {
                temp = MathEnter.Text + "sin("; MathEnter.Text = temp;
                AnyOperador = 1; CantidadTemporal = CantidadNumeros;
                Contar();
            }

        }

        private void Coseno_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio(); SuprimirInfinity(); ProductAfterCharacter();
            if (LastDigito != Flotante)
            {
                temp = MathEnter.Text + "cos("; MathEnter.Text = temp;
                AnyOperador = 1; CantidadTemporal = CantidadNumeros;
                Contar();
            }
  
        }

        private void Tangente_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio(); SuprimirInfinity(); ProductAfterCharacter();
            if (LastDigito != Flotante)
            {
                temp = MathEnter.Text + "tan("; MathEnter.Text = temp;
                AnyOperador = 1; CantidadTemporal = CantidadNumeros;
                Contar();
            }
 
        }
        #endregion

        #region Línea de Símbolos 2

        private void AnyPotencia_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio();

            if (Numeros.Contains(LastDigito) || Variables.Contains(LastDigito) || LastDigito == ")" || LastDigito == piSymbol 
                || LastDigito == eulerSymbol)
            {
                temp = temp + "^"; MathEnter.Text = temp;
            }
            else if (LastDigito == "¹" || LastDigito == "²" || LastDigito == "³" || LastDigito == "⁴")
            {
                    temp = temp.Remove(temp.Length - 1);
                        temp = temp + "^"; MathEnter.Text = temp;
            }
            else { ToastMessage(); }
        }

        private void Factorial_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio(); TemporalMemory();

            if (Numeros.Contains(LastDigito) && (!String.IsNullOrWhiteSpace(MathEnter.Text)) )
            {
                SplitResult = temp.Split(new char[] { '×', '+', '-', '÷', '/', '√', '^', '(', ')'}
                , StringSplitOptions.RemoveEmptyEntries); LastCharacters = SplitResult.Last().ToString();

                if (Int32.TryParse(LastCharacters, out int ItsAIntNumber))
                {
                    double factorial = 1;
                    for (int i = 1; i <= ItsAIntNumber; i++)
                    {
                        factorial = factorial * i;
                    }
                    string factorialResult = factorial.ToString();

                    int NumeroDeCaracteres = temp.Length; int NoToErase = LastCharacters.Length;
                        temp = temp.Remove(NumeroDeCaracteres - NoToErase);

                            MathEnter.Text = temp + factorialResult.Replace(".", Flotante).Replace("E",EXPSymbol);
                }
                else { FactorialMessage(); }
            }
            else { FactorialMessage(); }
        }

        private void RaizGeneral_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio();

            if (Numeros.Contains(LastDigito)) //&& LastDigito != Flotante)
            {
                temp = temp + "ª√("; MathEnter.Text = temp;
                AnyOperador = 1; CantidadTemporal = CantidadNumeros;
                Contar();

                HacerRaizGeneral = true;
            }
            else { ToastMessage(); }

            
        }

        private void Euler_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio(); SuprimirInfinity();
            if ( LastDigito == "%" || LastDigito == piSymbol || LastDigito == eulerSymbol || nPot.Contains(LastDigito)
                 || (Variables.Contains(LastDigito) && !(temp.Contains("Inf"))) )
            {
              MathEnter.Text = MathEnter.Text + ProductSymbol;
            }
            else { } 

            if (LastDigito != Flotante)
            {
                temp = MathEnter.Text + eulerSymbol + "^"; MathEnter.Text = temp;
                Contar();
            }
            else { }
        }

        private void Pi_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio(); SuprimirInfinity();
            if ( LastDigito == "%" || LastDigito == piSymbol || LastDigito == eulerSymbol || nPot.Contains(LastDigito)
                 || (Variables.Contains(LastDigito) && !(temp.Contains("Inf"))) )
            {
                MathEnter.Text = MathEnter.Text + ProductSymbol;
            }
            else { } 

            if (LastDigito != Flotante)
            {
                temp = MathEnter.Text + piSymbol; MathEnter.Text = temp;
                Contar();
            }
            else { }
        }

        #endregion

        #region Línea de Símbolos 1

        private void PuntoYComa_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio();

            if ( (Numeros.Contains(LastDigito) || LastDigito == ")" || nPotYFracc.Contains(LastDigito)) )
            {
                SplitResult = temp.Split(new char[] { '×', '+', '-', '÷', '/', '√', '^' }
                , StringSplitOptions.RemoveEmptyEntries); LastCharacters = SplitResult.Last().ToString();

                if (!LastCharacters.Contains(PuntoYComaSymbol))
                {
                    temp = temp + PuntoYComaSymbol; MathEnter.Text = temp;
                }
                else { AlreadyMessage(); }
            }
            else { ToastMessage(); }
          
        }

        private void PotenciaCuadrada_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio();
            if (Numeros.Contains(LastDigito) || Variables.Contains(LastDigito) || nPotYFracc.Contains(LastDigito) || LastDigito == ")" || LastDigito == piSymbol 
                || LastDigito == eulerSymbol)
            {
                temp = temp + "²"; MathEnter.Text = temp;
            }
            else if( LastDigito == "^")
            {
                    temp = temp.Remove(temp.Length - 1);
                        temp = temp + "²"; MathEnter.Text = temp;
            }
            else { ToastMessage(); }
        }

        private void Porcentaje_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio();
            if (Numeros.Contains(LastDigito) || Variables.Contains(LastDigito) || LastDigito == ")" || LastDigito == piSymbol
                || LastDigito == eulerSymbol)
            {
                temp = temp + "%"; MathEnter.Text = temp;
            }
            else { ToastMessage(); }
        }

        private void RaizCuadrada_Clicked(object sender, EventArgs e)
        {
           // if (HacerRaizGeneral == false)
            {
                SuprimirEspacio(); SuprimirInfinity(); ProductAfterCharacter();
                if (LastDigito != Flotante)
                {
                    temp = MathEnter.Text + "√("; MathEnter.Text = temp;
                    AnyOperador = 1; CantidadTemporal = CantidadNumeros;
                    Contar();
                }
                else {}
            }
           // else { }
        }

        private void ParentesisApertura_Clicked(object sender, EventArgs e)
        {
          //  if (HacerRaizGeneral == false)
            {
                SuprimirEspacio(); SuprimirInfinity();
                temp = MathEnter.Text; temp = temp + "(";
                if (LastDigito != Flotante)
                {
                    MathEnter.Text = temp;
                }
            }
           // else {}
        }

        private void ParentesisCierre_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio(); if (MathEnter.Text.Contains("ª√(")) { HacerRaizGeneral = true; }

            if (Numeros.Contains(LastDigito) || Variables.Contains(LastDigito) || nPotYFracc.Contains(LastDigito) || LastDigito == ")" || LastDigito == piSymbol
              || LastDigito == eulerSymbol || LastDigito == "%")
            {
                temp = temp + ")"; MathEnter.Text = temp;

                RevisarParentesis();

                if (HacerRaizGeneral == true)
                {
                    TemporalMemory(); ReemplazarVariables(); ReemplazarFunciones();

                    try
                    {
                       SplitResult = temp.Split(new char[] { 'ª', '√' }
                       , StringSplitOptions.RemoveEmptyEntries); LastCharacters = SplitResult.Last().ToString();

                       int NoToErase = LastCharacters.Length;

                       for (int i = 0; i <= NoToErase; i++)
                       {
                            if (LastCharacters[i] == '(') 
                            { LastCharacters = LastCharacters + ")"; temp = temp + ")"; }
                       } 
                       LastCharacters = LastCharacters + ")"; temp = temp + ")";

                    NoToErase = LastCharacters.Length;

                    ReemplazarSimbolos();

                    
                        var engine = new Mathos.Parser.MathParser();
                            double result = engine.Parse(LastCharacters.ToString());
                                    string resultS = result.ToString();
                    
                        if (Double.TryParse(resultS, out double radicando))
                        {
                            //<-----------Radicación (indice de la raiz)-------------------------->
                            int NumeroDeCaracteres = temp.Length;
                                    temp = temp.Remove(NumeroDeCaracteres - (NoToErase + 2));
                                        RadicacionGeneral(); /*=> Extrae radicación*/

                            NumeroDeCaracteres = temp.Length;
                                    temp = temp.Remove(NumeroDeCaracteres - NoEraseUNO);
                                            NumeroDeCaracteres = temp.Length;
                            //<------------------------Raíz negativa: ---------------------------->
                            if ((Math.Floor(Indice) == Indice) && (Indice % 2 != 0) && (radicando < 0))
                            {
                                resultadoRaiz = -( Math.Round((Math.Pow(Math.Abs(radicando), 1 / Indice)), 15, MidpointRounding.ToEven) );

                                try { LastDigito = temp.Last().ToString(); } catch { LastDigito = " "; } /*-> Extraer LastDigito*/

                                    if (LastDigito == "+")
                                    {
                                        temp = temp.Remove(NumeroDeCaracteres - 1);
                                    }
                                    else if (LastDigito == "-")
                                    {
                                        temp = temp.Remove(NumeroDeCaracteres - 1);

                                        try { LastDigito = temp.Last().ToString(); } catch { LastDigito = " "; }

                                            if (LastDigito == " " || LastDigito == "(" || LastDigito == ProductSymbol || LastDigito == divisionSymbol || LastDigito == "/") {}
                                            else { temp = temp + "+"; }

                                        resultadoRaiz = -(resultadoRaiz);
                                    }
                                    else {}
                            }
                            else
                            {
                                resultadoRaiz = Math.Round((Math.Pow(radicando, 1 / Indice)), 15, MidpointRounding.ToEven);
                            }

                            ResultadoRaiz = resultadoRaiz.ToString();
                            /*Remueve la entrada AUTOMÁTICA "0+" generada en el método <RevisarParetensis()>:*/
                            if ( ( !string.IsNullOrEmpty(temp) ) && temp[0] == '0' && temp[1] == '+') { temp = temp.Substring(2); } else {}
                            //*********************************************************************************

                            MathEnter.Text = temp.Replace("sqrt", "√").Replace(" ","").Replace("ɳ", "n").Replace("ŋ", "n").Replace("ċos", "cos")
                                             + ResultadoRaiz.Replace(".", Flotante).Replace("E", EXPSymbol);

                            if (!MathEnter.Text.Contains("ª√"))
                            { HacerRaizGeneral = false; } else {}


                            /* Vuelve a reemplazar las variables si NO contienen la raíz enésima ---------------*/
                            #region Reemplazar Contenidos por variables ->
                            if ( !string.IsNullOrEmpty(Settings.X) && !(Settings.X.Contains("ª√")) )
                            {
                                MathEnter.Text = MathEnter.Text.Replace("(" + Settings.X + ")", "x");
                            }
                            if ( !string.IsNullOrEmpty(Settings.Y) && !(Settings.Y.Contains("ª√")) )
                            {
                                MathEnter.Text = MathEnter.Text.Replace("(" + Settings.Y + ")", "y");
                            }
                            if ( !string.IsNullOrEmpty(Settings.Z) && !(Settings.Z.Contains("ª√")) )
                            {
                                MathEnter.Text = MathEnter.Text.Replace("(" + Settings.Z + ")", "z");
                            }
                            if ( !string.IsNullOrEmpty(Settings.W) && !(Settings.W.Contains("ª√")) )
                            {
                                MathEnter.Text = MathEnter.Text.Replace("(" + Settings.W + ")", "w");
                            }
                            #endregion
                            /*----------------------------------------------------------------------------------*/

                        }
                        else {}
                    }
                    catch { MathResult.HorizontalTextAlignment = TextAlignment.Center; MathResult.Text = "Equa Error"; HacerRaizGeneral = false; }

                }
                else {}

            }
            else { HacerRaizGeneral = false; ToastMessage(); }


        }

        #endregion

        #region Operadores Básicos

        private void Division_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio();

            if (Numeros.Contains(LastDigito) || Variables.Contains(LastDigito) || nPotYFracc.Contains(LastDigito) || LastDigito == ")" || LastDigito == "%"
                || LastDigito == piSymbol || LastDigito == eulerSymbol)
            {
                MathEnter.Text  = temp + divisionSymbol;
                AnyOperador = 1; CantidadTemporal = CantidadNumeros;
                Contar();
            }
            else if ( (LastDigito == "+") || (LastDigito == ProductSymbol) )
            {
                MathEnter.Text = ( temp.Remove(temp.Length - 1) ) + divisionSymbol;
            }
            else if (LastDigito == divisionSymbol || LastDigito == "/")
            {
                AlreadyMessage();
            }
            else if (MathEnter.Text.Length > 1 && LastDigito == "-")
            {
                temp = (temp.Remove(temp.Length - 1)); LastDigito = temp.Last().ToString();

                if (Numeros.Contains(LastDigito) || Variables.Contains(LastDigito) || nPotYFracc.Contains(LastDigito) || LastDigito == ")" || LastDigito == "%"
                || LastDigito == piSymbol || LastDigito == eulerSymbol )
                {
                    MathEnter.Text = temp + divisionSymbol;
                }
                else { ToastMessage(); }
            }
            else { ToastMessage(); }
        }

        private void Producto_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio();
            if (Numeros.Contains(LastDigito) || Variables.Contains(LastDigito) || nPotYFracc.Contains(LastDigito) || LastDigito == ")" || LastDigito == "%"
                || LastDigito == piSymbol || LastDigito == eulerSymbol)
            {
                temp = temp + ProductSymbol;    MathEnter.Text = temp;
                AnyOperador = 1; CantidadTemporal = CantidadNumeros;
                Contar();
            }
            else if (LastDigito == "+" || LastDigito == divisionSymbol || LastDigito == "/")
            {
                MathEnter.Text = ( temp.Remove(temp.Length - 1) + ProductSymbol );
            }
            else if(LastDigito == ProductSymbol)
            {
                AlreadyMessage();
            }
            else if (MathEnter.Text.Length > 1 && LastDigito == "-")
            {
                temp = (temp.Remove(temp.Length - 1)); LastDigito = temp.Last().ToString();

                if (Numeros.Contains(LastDigito) || Variables.Contains(LastDigito) || nPotYFracc.Contains(LastDigito) || LastDigito == ")" || LastDigito == "%"
                || LastDigito == piSymbol || LastDigito == eulerSymbol )
                {
                    MathEnter.Text = temp + ProductSymbol;
                }
                else { ToastMessage(); }
            }
            else { ToastMessage(); }
        }

        private void Substraccion_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio();
            if (Numeros.Contains(LastDigito) || AdmitSubtraction.Contains(LastDigito) || nPotYFracc.Contains(LastDigito))
            {
                MathEnter.Text = MathEnter.Text + "-";
                AnyOperador = 1; CantidadTemporal = CantidadNumeros;
                Contar();
            }
            else if (LastDigito == "+")
            {
                MathEnter.Text = (temp.Remove(temp.Length - 1) + "-");
            }

            else if (MathEnter.Text.Length > 1 && LastDigito == "-")
            {
                temp = (temp.Remove(temp.Length - 1)); LastDigito = temp.Last().ToString();

                if (Numeros.Contains(LastDigito) || Variables.Contains(LastDigito) || nPotYFracc.Contains(LastDigito) || LastDigito == ")" || LastDigito == "%"
                    || LastDigito == piSymbol || LastDigito == eulerSymbol)
                {
                    MathEnter.Text = temp + "+";
                }
                else { MathEnter.Text = temp; }
            }
            else if (MathEnter.Text.Length == 1 && LastDigito == "-")
            {
                MathEnter.Text = " ";
            }
            else { ToastMessage(); }
        }

        private void Adicion_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio();
            if (Numeros.Contains(LastDigito) || Variables.Contains(LastDigito) || nPotYFracc.Contains(LastDigito) || LastDigito == ")" || LastDigito == "%"
                || LastDigito == piSymbol || LastDigito == eulerSymbol)
            {
                temp = temp + "+";  MathEnter.Text = temp;
                AnyOperador = 1; CantidadTemporal = CantidadNumeros;
                Contar();
            }
            else if (LastDigito == ProductSymbol || LastDigito == divisionSymbol || LastDigito == "/")
            {
                MathEnter.Text = ( temp.Remove(temp.Length - 1) ) + "+";
            }
            else if (LastDigito == "+")
            {
                AlreadyMessage();
            }
            else if (MathEnter.Text.Length > 1 && LastDigito == "-")
            {
                NegativeMessage();
            }
           /* else if (MathEnter.Text.Length > 1 && LastDigito == "-")
            {
                temp = (temp.Remove(temp.Length - 1)); LastDigito = temp.Last().ToString();

                if ( Numeros.Contains(LastDigito) || Variables.Contains(LastDigito) || nPotYFracc.Contains(LastDigito) || LastDigito == ")" || LastDigito == "%"
                    || LastDigito == piSymbol || LastDigito == eulerSymbol )
                {
                    MathEnter.Text = temp + "+";
                }
                else {}
            } */
            else { ToastMessage(); }
        }

        #endregion

        #region Números
        /*----------------------------------------------Números---------------------------------------*/
        private void Nueve_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio(); SuprimirInfinity(); PointAfterZero(); ProductAfterCharacter();
            temp = MathEnter.Text + "9";   MathEnter.Text = temp;
            Contar();
        }

        private void Ocho_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio(); SuprimirInfinity(); PointAfterZero(); ProductAfterCharacter();
            temp = MathEnter.Text + "8";   MathEnter.Text = temp;
            Contar();
        }

        private void Siete_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio(); SuprimirInfinity(); PointAfterZero(); ProductAfterCharacter();
            temp = MathEnter.Text + "7";   MathEnter.Text = temp;
            Contar();
        }

        private void Seis_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio(); SuprimirInfinity(); PointAfterZero(); ProductAfterCharacter();
            temp = MathEnter.Text + "6";   MathEnter.Text = temp;
            Contar();
        }

        private void Cinco_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio(); SuprimirInfinity(); PointAfterZero(); ProductAfterCharacter();
            temp = MathEnter.Text + "5";   MathEnter.Text = temp;
            Contar();
        }

        private void Cuatro_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio(); SuprimirInfinity(); PointAfterZero(); ProductAfterCharacter();
            temp = MathEnter.Text + "4";   MathEnter.Text = temp;
            Contar();
        }

        private void Tres_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio(); SuprimirInfinity(); PointAfterZero(); ProductAfterCharacter();
            temp = MathEnter.Text + "3";   MathEnter.Text = temp;
            Contar();
        }

        private void Dos_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio(); SuprimirInfinity(); PointAfterZero(); ProductAfterCharacter();
            temp = MathEnter.Text + "2";   MathEnter.Text = temp;
            Contar();
        }

        private void Uno_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio(); SuprimirInfinity(); PointAfterZero(); ProductAfterCharacter();
            temp = MathEnter.Text + "1";   MathEnter.Text = temp;
            Contar();
        }

        private void Cero_Clicked(object sender, EventArgs e)
        {
            SuprimirEspacio(); SuprimirInfinity(); PointAfterZero(); ProductAfterCharacter();   
            temp = MathEnter.Text + "0"; MathEnter.Text = temp;
            Contar();           
        }
        #endregion

        private void Contar()
        {
            if (AnyOperador == 0)
            {
                CantidadNumeros = CantidadNumeros + 1;
                
                if (CantidadNumeros >= 16)
                {
                    temp = MathEnter.Text; int NumeroDeCaracteres = temp.Length;
                    MathEnter.Text = temp.Remove(NumeroDeCaracteres - 1);
                    CantidadNumeros = CantidadNumeros - 1;
                }
                else {}

            }

            else if (AnyOperador == 1)
            {
                CantidadNumeros = 0;
                AnyOperador = 0;
            }
        }
        private void SuprimirEspacio()
        {
            temp = MathEnter.Text;
            try { LastDigito = temp.Last().ToString(); } catch { LastDigito = " "; }
            if (LastDigito == " ")
            {
                MathEnter.Text = "";  //Suprime el espacio: Pantalla en blanco//
                HacerRaizGeneral = false;
            }
            else {}

        }
        private void SuprimirInfinity()
        {
            if ((MathEnter.Text.Contains("Inf") && (LastDigito == "y" || LastDigito == "o") ) )
            {
                int NumeroDeCaracteres = temp.Length;
                { MathEnter.Text = temp.Remove(NumeroDeCaracteres - 8); }
            }
            else if ((MathEnter.Text.Contains("NaN") && LastDigito == "N"))
            {
                int NumeroDeCaracteres = temp.Length;
                { MathEnter.Text = temp.Remove(NumeroDeCaracteres - 3); }
            }
            else {}

        }
        private void PointAfterZero()
        {
            SplitResult = temp.Split(new char[] { '×', '+', '-', '÷', '/', '√', '^', '(', ';' });
            LastCharacters = SplitResult.Last().ToString();

            if (Double.TryParse(LastCharacters, out double a))
            {
                if (a == 0 && !LastCharacters.Contains(Flotante))
                {
                    temp = temp + Flotante; MathEnter.Text = temp;
                }
                else {}
            }
            else {}

        }
        private void ProductAfterCharacter()
        {
            if (LastDigito == ")" || LastDigito == "%" || LastDigito == piSymbol
                || LastDigito == eulerSymbol || nPotYFracc.Contains(LastDigito) || ( Variables.Contains(LastDigito) && !(temp.Contains("Inf")) ) )
            {   MathEnter.Text = MathEnter.Text + ProductSymbol; }
            else {}
        }

        private void TemporalMemory()
        {
            //******************************Memoria temporal **********************************************************************//                                                      
            if (!RAM.Contains(MathEnter.Text) && !(string.IsNullOrWhiteSpace(MathEnter.Text)))
            {
                if (NoCasilla >= MaxRAM)
                { NoCasilla = 0;

                    for (int i = 0; i < MaxRAM; i++)
                    {
                        RAM[i] = string.Empty;
                    }
                }

                RAM[NoCasilla] = MathEnter.Text;
                NoCasilla = NoCasilla + 1;

                Retornar.IsVisible = true;
                ChangeColor();
            }
            else {}
            RAMPreset = 1;          /*Para comenzar nuevamente desde la última posición de memoria*/
//*********************************************************************************************************************//

        }
        private void ChangeColor()
        {
            if (Retornar.TextColor == Color.YellowGreen)
            {
                Retornar.TextColor = Color.Orange;
            }
            else { Retornar.TextColor = Color.YellowGreen; }
        }

        private void ModoRadOrDeg()
        {
            if (RadDegree.Text == "RAD")
            {
                RadDegree.Text = "DEG";
            }
            else if (RadDegree.Text == "DEG")
            {
                RadDegree.Text = "RAD";
            }
            else { RadDegree.Text = "RAD"; } /*sólo por seguridad*/

            Settings.RaDeGree = RadDegree.Text;
        }

        private void RadicacionGeneral()
        {
            {
                SplitResult = temp.Split(new char[] { '×', '+', '-', '÷', 'ε', '/', 'ª', '√', '^', '(', ')' });
                LastCharacters = SplitResult.Last().ToString();
                LastCharacters = LastCharacters.Replace(Flotante, ".").Replace(EXPSymbol, EXPExpresion);

                if (!string.IsNullOrWhiteSpace(LastCharacters))
                {
                    if (Double.TryParse(LastCharacters, out double radicacion))
                    {
                        Indice = radicacion;
                        NoEraseUNO = LastCharacters.Length;

                        ProductAfterCharacter();
                    }
                    else {}
                }
                else { Indice = 1; NoEraseUNO = 1; }

            }

        }

        private void RevisarParentesis()
        {
            int MaxCharacteres = temp.Length; int Apertura = 0; int Cerramiento = 0;
            for (int i = 0; i < MaxCharacteres; i++)
            {
                if (temp[i] == '(')
                {
                    Apertura += 1;
                }
                else if (temp[i] == ')')
                {
                    Cerramiento += 1;
                }
                else { }
            }


            if (Apertura >= Cerramiento)
            {
                int NoParentesis = Apertura - Cerramiento;
                for (int i = 1; i <= NoParentesis; i++)
                {
                    MathEnter.Text = MathEnter.Text + ")"; temp = temp + ")";
                }

            }
            else
            {

                int NoParentesis = Cerramiento - Apertura;
                for (int i = 1; i <= NoParentesis; i++)
                {
                    MathEnter.Text = "(" + MathEnter.Text; temp = "(" + temp;
                }
            }

            /* Necesario para ejecutar expresiones como 3-(-10x-2-3 o (-10+2) o -(-10*-3)-2: */ 
            if (  MathEnter.Text.Contains("(-") && ( MathEnter.Text[1] == '-' ||  (MathEnter.Text[1] == '-' && 
                  MathEnter.Text[2] == '(' && MathEnter.Text[3] == '-') )  )
            {
                temp = " " + temp;
            }
            else if (MathEnter.Text.Contains("-(") && MathEnter.Text[0] == '-' && MathEnter.Text[1] == '(')
            {
               temp = "0+" + temp;
            }
            else {}

        }

        private void CargarVariablesConRaizGeneral()
        {
            if (temp.Contains("x") && Settings.X.Contains("ª√("))
            {
                HacerRaizGeneral = true; MathEnter.Text = MathEnter.Text.Replace("x", Settings.X);
            }
            if (temp.Contains("y") && Settings.Y.Contains("ª√("))
            {
                HacerRaizGeneral = true; MathEnter.Text = MathEnter.Text.Replace("y", Settings.Y);
            }
            if (temp.Contains("z") && Settings.Z.Contains("ª√("))
            {
                HacerRaizGeneral = true; MathEnter.Text = MathEnter.Text.Replace("z", Settings.Z);
            }
            if (temp.Contains("w") && Settings.W.Contains("ª√("))
            {
                HacerRaizGeneral = true; MathEnter.Text = MathEnter.Text.Replace("w", Settings.W);
            }
            else { }
        }
     
        private void ToastMessage()
        {
            #region Cargar IdiomA ->
            if (Settings.IdiomA == "Español" || Settings.IdiomA == "Spanish")
            {
                ButtonMessage = "Primero ingresa al menos un número.";
            }
            else if(Settings.IdiomA == "Inglés" || Settings.IdiomA == "English")
            {
                ButtonMessage = "Enter at least a number first.";
            }
            #endregion

            Toast.MakeText(Android.App.Application.Context, ButtonMessage, ToastLength.Short).Show();
        }
        private void IgualMessage()
        {
            #region Cargar IdiomA ->
            if (Settings.IdiomA == "Español" || Settings.IdiomA == "Spanish")
            {
                ButtonMessage = "El resultado es el mismo.";
            }
            else if (Settings.IdiomA == "Inglés" || Settings.IdiomA == "English")
            {
                ButtonMessage = "Result is the same.";
            }
            #endregion

            Toast.MakeText(Android.App.Application.Context, ButtonMessage, ToastLength.Short).Show();

        }       
        private void AlreadyMessage()
        {
            #region Cargar IdiomA ->
            if (Settings.IdiomA == "Español" || Settings.IdiomA == "Spanish")
            {
                ButtonMessage = "Este símbolo ya existe.";
            }
            else if (Settings.IdiomA == "Inglés" || Settings.IdiomA == "English")
            {
                ButtonMessage = "It is already exists.";
            }
            #endregion

            Toast.MakeText(Android.App.Application.Context, ButtonMessage, ToastLength.Short).Show();

        }
        private void NegativeMessage()
        {
            #region Cargar IdiomA ->
            if (Settings.IdiomA == "Español" || Settings.IdiomA == "Spanish")
            {
                ButtonMessage = "El resultado es negativo.";
            }
            else if (Settings.IdiomA == "Inglés" || Settings.IdiomA == "English")
            {
                ButtonMessage = "Result is negative.";
            }
            #endregion

            Toast.MakeText(Android.App.Application.Context, ButtonMessage, ToastLength.Short).Show();
        }
        private void FactorialMessage()
        {
            #region Cargar IdiomA ->
            if (Settings.IdiomA == "Español" || Settings.IdiomA == "Spanish")
            {
                ButtonMessage = "Ingresa delante un número entero.";
            }
            else if (Settings.IdiomA == "Inglés" || Settings.IdiomA == "English")
            {
                ButtonMessage = "Enter an integer number first.";
            }
            #endregion

            Toast.MakeText(Android.App.Application.Context, ButtonMessage, ToastLength.Short).Show();
        }
        private void CanNotSaveMessage()
        {
            #region Cargar Idioma ->
            if (Settings.IdiomA == "Español" || Settings.IdiomA == "Spanish")
            {
                Imposible = "Imposible guardar.";
            }
            else if (Settings.IdiomA == "Inglés" || Settings.IdiomA == "English")
            {
                Imposible = "Not possible to save it.";
            }
            #endregion

            Toast.MakeText(Android.App.Application.Context, Imposible, ToastLength.Short).Show();
        }

        private async void Informacion()
        {
            #region Cargar Idioma ->
            if(Settings.IdiomA == "Español" || Settings.IdiomA == "Spanish")
            {
                Recuerda = "Recuerda...";
                InfoText = "Toca el logo de la app, en la esquina superior izquierda, " +
                           "para ver el menú de opciones.\n¿Quieres seguir viendo este mensaje?";
                SiButton = "Si";
            }
            else if (Settings.IdiomA == "Inglés" || Settings.IdiomA == "English")
            {
                Recuerda = "Remind...";
                InfoText = "Touch the logo of the app, at the upper left corner, " +
                           "to see the options menu.\nWould you like to see this message again?";
                SiButton = "Yes";
            }
            #endregion

            /*Sólo es un mensaje informativo----------------------------------------------------------------------->*/
            if ((Settings.MostrarInfo) == true)
            {
                if (OneTimeI == false)
                {
                   var answer = await DisplayAlert(Recuerda, InfoText , "No", SiButton);
                   OneTimeI = true;

                   if(answer == true)
                   {
                        Settings.MostrarInfo = false;
                   }
                   else {}
                }
            }
            else {}

            /*Nota: No = True; Si = false; Atrás o ninguno es igual a false*/
        /*----------------------------------------------------------------------------------------------------->*/
        }
        private async void MensajeSys() 
        {
            #region Cargar Idioma
            if (Settings.IdiomA == "Español" || Settings.IdiomA == "Spanish")
            {
                SysErrorTitle = "Error de sintaxis";
                SysErrorMess = "La expresión es incorrecta.";
                EstaBienMess = "Está bien";
            }
            else if (Settings.IdiomA == "Inglés" || Settings.IdiomA == "English")
            {
                SysErrorTitle = "Syntax error";
                SysErrorMess = "It is an inaccurate expression.";
                EstaBienMess = "Ok";
            }
            #endregion

            // if (e == null) { return; }        
            await DisplayAlert(SysErrorTitle, SysErrorMess, EstaBienMess);
                    OneTime = true;          
            //var answer = await DisplayAlert("Question", "Would you like to play a game?", "Yes", "No");
            //Debug.WriteLine("Answer: " + answer);
           
        }

        protected override void OnAppearing()
        {
            Informacion();
        }

    }

}
