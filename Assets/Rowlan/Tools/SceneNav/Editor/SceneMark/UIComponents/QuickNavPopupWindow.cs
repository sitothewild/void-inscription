using System.Collections;
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;

namespace Rowlan.SceneMark
{
    public class QuickNavPopupWindow : PopupWindowContent
    {
        private QuickNavEditorModule module;
        private string headerText;

        public QuickNavPopupWindow(QuickNavEditorModule module, string headerText)
        {
            this.module = module;
            this.headerText = headerText;
        }
        public override Vector2 GetWindowSize()
        {
            return new Vector2(200, 80);
        }

        public override void OnGUI(Rect rect)
        {
            EditorGUILayout.BeginVertical( GUIStyles.AppTitleBoxStyle);
            {
                EditorGUILayout.LabelField(headerText, GUIStyles.PopupTitleStyle);

                if (GUILayout.Button("Add Separator"))
                {
                    module.GetDataManager().AddSeparatorToFavorites();
                    editorWindow.Close();
                }

                //GUILayout.FlexibleSpace();

                if (GUILayout.Button("Close"))
                {
                    editorWindow.Close();
                }
            }
            EditorGUILayout.EndVertical();

        }

        public override void OnOpen()
        {
        }

        public override void OnClose()
        {
        }
    }
}