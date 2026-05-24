using System.Collections;
using System.Collections.Generic;
using UnityEditor;
using UnityEditorInternal;
using UnityEngine;
using static Rowlan.SceneMark.QuickNavEditorModule;

namespace Rowlan.SceneMark
{
    public class QuickNavListControl : ReorderableList
    {
        private int currentSelectionIndex = 0;

        private QuickNavEditorModule module;
        private ModuleType moduleType;

        #region Layout

        float margin = 3;

        // float objectIconWidth = 16;
        // float pingButtonWidth = 30;
        float jumpButtonWidth = 30;
        float favoriteButtonWidth = 30;
        float deleteButtonWidth = 30;
        //float contextButtonWidth = 28;

        #endregion Layout

        public QuickNavListControl(QuickNavEditorModule module, string headerText, bool reorderEnabled, UnityEditor.SerializedObject serializedObject, UnityEditor.SerializedProperty serializedProperty) : base(serializedObject, serializedProperty)
        {
            this.module = module;
            this.moduleType = module.GetModuleType();

            draggable = reorderEnabled;
            displayAdd = false;
            displayRemove = false;

            // list header
            drawHeaderCallback = rect =>
            {
                EditorGUI.LabelField(rect, headerText);
            };

            drawElementCallback = (rect, index, active, focused) =>
            {
                // Get the currently to be drawn element from the list
                SerializedProperty element = serializedProperty.GetArrayElementAtIndex(index);

                var contextProperty = element.FindPropertyRelative("context");

                // get the context and the object
                bool isSeparatorContext = contextProperty.enumValueIndex == (int)QuickNavItem.Context.Separator;

                if( isSeparatorContext)
                {
                    DrawSeparatorItemContext(rect, serializedObject, element);
                }
                else
                {
                    DrawQuickNavItemContext(rect, serializedObject, element);
                }

                // advance to next line for the next property
                rect.y += EditorGUIUtility.singleLineHeight;
            };

            
            elementHeightCallback = (index) =>
            {
                SerializedProperty element = serializedProperty.GetArrayElementAtIndex(index);
                var contextProperty = element.FindPropertyRelative("context");
                bool isSeparatorContext = contextProperty.enumValueIndex == (int)QuickNavItem.Context.Separator;

                if (isSeparatorContext)
                    return EditorGUIUtility.singleLineHeight + 6; // 6 = little bit of margin
                else
                    return EditorGUIUtility.singleLineHeight * 5;
            };
            
        }

        private void DrawSeparatorItemContext(Rect rect, SerializedObject serializedObject, SerializedProperty element)
        {
            var separatorNameProperty = element.FindPropertyRelative("title");

            float left = 0;
            float width = 0;
            float right = 0;

            width = EditorGUIUtility.currentViewWidth - (right + margin) - deleteButtonWidth - margin * 6 - 23;
            left = right + margin; right = left + width;

            separatorNameProperty.stringValue = EditorGUI.TextField(new Rect(rect.x + left, rect.y + margin, width, EditorGUIUtility.singleLineHeight), separatorNameProperty.stringValue, GUIStyles.SeparatorStyle);

            // delete button
            {
                width = deleteButtonWidth;
                left = right + margin; right = left + width;
                if (GUI.Button(new Rect(rect.x + left, rect.y + margin, width, EditorGUIUtility.singleLineHeight), GUIStyles.DeleteIcon))
                {
                    module.GetQuickNavItemList().RemoveAt(index);

                    EditorUtility.SetDirty(serializedObject.targetObject);
                }
            }
        }

        private void DrawQuickNavItemContext( Rect rect, SerializedObject serializedObject, SerializedProperty element)
        {
            var contextProperty = element.FindPropertyRelative("context");

            var unityObjectProperty = element.FindPropertyRelative("unityObject");
            var objectGuidProperty = element.FindPropertyRelative("objectGuid");
            var sceneViewPositionProperty = element.FindPropertyRelative("sceneMark.sceneViewPosition");

            var titleProperty = element.FindPropertyRelative("title");
            var detailsProperty = element.FindPropertyRelative("details");

            var sceneMarkProperty = element.FindPropertyRelative("sceneMark");
            var snapshotProperty = sceneMarkProperty.FindPropertyRelative("snapshot");

            float left = 0;
            float width = 0;
            float right = 0;
            float previewTextureBorder = 1;
            float previewTextureSize = 80;
            float leftInset;

            UnityEngine.Object currentObject = unityObjectProperty.objectReferenceValue;

            // image
            {
                //rect.y += EditorGUIUtility.singleLineHeight;

                width = jumpButtonWidth;
                left = right + margin; right = left + width;
                Rect previewTextureRect = new Rect(rect.x, rect.y + margin + previewTextureBorder, previewTextureSize, previewTextureSize);

                // image is left, rest is right to the image
                leftInset = previewTextureRect.xMax;

                Texture2D previewTexture = snapshotProperty.objectReferenceValue as Texture2D;
                if (previewTexture)
                {
                    EditorGUI.DrawPreviewTexture(previewTextureRect, previewTexture);
                }

                // click on texture => jump to position; need to use MouseUp, for MouseDown the index (and selection) aren't ready yet
                bool previewTextureClicked = Event.current.rawType == EventType.MouseUp && previewTextureRect.Contains(Event.current.mousePosition);
                if (previewTextureClicked)
                {
                    currentSelectionIndex = index;
                    module.JumpToSceneMark(currentSelectionIndex);
                }
            }

            rect.x = leftInset;
            //rect.width -= leftInset;

            // jump button
            {
                width = jumpButtonWidth;
                left = margin; right = margin + jumpButtonWidth;
                if (GUI.Button(new Rect(rect.x + left, rect.y + margin, width, EditorGUIUtility.singleLineHeight), GUIStyles.JumpIcon))
                {
                    currentSelectionIndex = index;
                    module.JumpToQuickNavItem(false, currentSelectionIndex);
                }
            }

            // object icon
            /*
            {
                width = objectIconWidth;
                left = right + margin; right = left + width;


                // create guicontent, but remove the text; we only want the icon
                GUIContent gc = EditorGUIUtility.ObjectContent(currentObject, typeof(object));
                gc.text = null;

                // show icon
                EditorGUI.LabelField(new Rect(rect.x + left, rect.y + margin, width, EditorGUIUtility.singleLineHeight), gc);
            }
            */

            // object name
            {
                //width = 128;
                width = EditorGUIUtility.currentViewWidth - rect.x - jumpButtonWidth - deleteButtonWidth - margin * 3 - 22;
                width -= moduleType == ModuleType.History ? favoriteButtonWidth : 10; // favorites button isn't shown in favorites tab; however there's a drag handle and we don't want the delete button cut off when the scrollbars appear => use arbitrary value (need to find out scrollbar width later)
                left = right + margin; right = left + width;

                string displayName = unityObjectProperty.objectReferenceValue != null ? unityObjectProperty.objectReferenceValue.name : "<invalid>";

                //EditorGUI.LabelField(new Rect(rect.x + left, rect.y + margin, width, EditorGUIUtility.singleLineHeight), displayName);
                GUIContent objectContent = EditorGUIUtility.ObjectContent(currentObject, typeof(object));

                if (GUI.Button(new Rect(rect.x + left, rect.y + margin, width, EditorGUIUtility.singleLineHeight), objectContent, GUIStyles.ObjectButtonStyle))
                {
                    currentSelectionIndex = index;
                    module.JumpToQuickNavItem(true, currentSelectionIndex);
                }
            }

            /*
            // object property
            {
                // textfield is stretched => calculate it from total length - left position - all the buttons to the right - number of margins ... and the fixed number is just arbitrary
                width = EditorGUIUtility.currentViewWidth - (right + margin) - jumpButtonWidth - favoriteButtonWidth - margin * 3 - 22;
                left = right + margin; right = left + width;

                EditorGUI.PropertyField(new Rect(rect.x + left, rect.y + margin, width, EditorGUIUtility.singleLineHeight), unityObjectProperty, GUIContent.none);
            }
            */

            // favorite button
            if (moduleType == ModuleType.History)
            {
                Vector3 sceneViewPosition = sceneViewPositionProperty.vector3Value;
                bool isFavoritesItem = module.GetDataManager().IsFavoritesItem(sceneViewPosition);

                bool guiEnabledPrev = GUI.enabled;
                {
                    // disable the button in case it is already a favorite
                    GUI.enabled = !isFavoritesItem;

                    width = favoriteButtonWidth;
                    left = right + margin; right = left + width;
                    if (GUI.Button(new Rect(rect.x + left, rect.y + margin, width, EditorGUIUtility.singleLineHeight), GUIStyles.FavoriteIcon))
                    {

                        #region SceneNav
                        
                        QuickNavItem currentItem = module.GetQuickNavItemList().GetItemAt(index);
                        QuickNavItem navItem = currentItem.Clone();

                        #endregion SceneNav

                        module.GetDataManager().AddToFavorites(navItem);

                        EditorUtility.SetDirty(serializedObject.targetObject);

                    }
                }
                GUI.enabled = guiEnabledPrev;
            }

            // delete button
            {
                width = deleteButtonWidth;
                left = right + margin; right = left + width;
                if (GUI.Button(new Rect(rect.x + left, rect.y + margin, width, EditorGUIUtility.singleLineHeight), GUIStyles.DeleteIcon))
                {
                    module.GetQuickNavItemList().RemoveAt(index);

                    EditorUtility.SetDirty(serializedObject.targetObject);

                }
            }

            rect.y += EditorGUIUtility.singleLineHeight;
            rect.y += margin;
            right = 0;

            float prefixLabelWidth = 50;
            // title
            {
                width = prefixLabelWidth;
                left = margin; right = left + prefixLabelWidth;

                EditorGUI.PrefixLabel(new Rect(rect.x + left, rect.y + margin, width, EditorGUIUtility.singleLineHeight), new GUIContent( "Title"));

                width = EditorGUIUtility.currentViewWidth - rect.x - left - right - margin * 3 - 22;
                left = right + margin; right = left + width;
                titleProperty.stringValue = EditorGUI.TextField(new Rect(rect.x + left, rect.y + margin, width, EditorGUIUtility.singleLineHeight), titleProperty.stringValue);

            }

            rect.y += EditorGUIUtility.singleLineHeight;
            rect.y += margin;

            // details
            {
                width = prefixLabelWidth;
                left = margin; right = left + prefixLabelWidth;

                EditorGUI.PrefixLabel(new Rect(rect.x + left, rect.y + margin, width, EditorGUIUtility.singleLineHeight), new GUIContent("Details"));

                width = EditorGUIUtility.currentViewWidth - rect.x - left - right - margin * 3 - 22;
                left = right + margin; right = left + width;
                float height = EditorGUIUtility.singleLineHeight * 2f + margin * 2;
                detailsProperty.stringValue = EditorGUI.TextArea(new Rect(rect.x + left, rect.y + margin, width, height), detailsProperty.stringValue);

            }

            // instance id; not relevant to show for now
            /*
            width = 50;
            left = right + margin; right = left + width;
            EditorGUI.BeginDisabledGroup(true);
            {
                EditorGUI.PropertyField(new Rect(rect.x + left, rect.y + margin, width, EditorGUIUtility.singleLineHeight), instanceIdProperty, GUIContent.none);
            }
            EditorGUI.EndDisabledGroup();
            */
        }

        /*
        private void DrawDebugComponents(Rect rect, SerializedObject serializedObject, SerializedProperty element)
        {
            float left = 0;
            float width = 0;
            float right = 0;
            float leftInset = 90;

            float prefixLabelWidth = 80;// EditorGUIUtility.labelWidth;

            var sceneMarkProperty = element.FindPropertyRelative("sceneMark");
            var contextProperty = element.FindPropertyRelative("context");

            var unityObjectProperty = element.FindPropertyRelative("unityObject");

            var cameraPositionProperty = sceneMarkProperty.FindPropertyRelative("cameraPosition");
            var cameraRotationProperty = sceneMarkProperty.FindPropertyRelative("cameraRotation");

            var sceneViewPositionProperty = sceneMarkProperty.FindPropertyRelative("sceneViewPosition");
            var sceneViewRotationProperty = sceneMarkProperty.FindPropertyRelative("sceneViewRotation");

            var snapshotProperty = sceneMarkProperty.FindPropertyRelative("snapshot");

            // camera position
            {
                rect.y += EditorGUIUtility.singleLineHeight;

                // value
                Vector3 position = cameraPositionProperty.vector3Value;

                // label
                width = prefixLabelWidth - margin - leftInset;
                left = leftInset + margin;
                EditorGUI.PrefixLabel(new Rect(rect.x + left, rect.y + margin, width, EditorGUIUtility.singleLineHeight), new GUIContent("Position", "Transform Position"));

                // gui value
                width = EditorGUIUtility.currentViewWidth - prefixLabelWidth - margin * 3 - 22 - leftInset;
                left = leftInset + prefixLabelWidth + margin;
                right = left + width;
                EditorGUI.Vector3Field(new Rect(rect.x + left, rect.y + margin, width, EditorGUIUtility.singleLineHeight), "", position);
            }

            // camera rotation
            {
                rect.y += EditorGUIUtility.singleLineHeight;

                // value
                Vector3 rotation = cameraRotationProperty.quaternionValue.eulerAngles;

                // label
                width = prefixLabelWidth - margin - leftInset;
                left = leftInset + margin;
                EditorGUI.PrefixLabel(new Rect(rect.x + left, rect.y + margin, width, EditorGUIUtility.singleLineHeight), new GUIContent("Rotation", "Transform Rotation"));

                // gui value
                width = EditorGUIUtility.currentViewWidth - prefixLabelWidth - margin * 3 - 22 - leftInset;
                left = leftInset + prefixLabelWidth + margin;
                right = left + width;
                EditorGUI.Vector3Field(new Rect(rect.x + left, rect.y + margin, width, EditorGUIUtility.singleLineHeight), "", rotation);
            }


            // sceneview position
            {
                rect.y += EditorGUIUtility.singleLineHeight;

                // value
                Vector3 position = sceneViewPositionProperty.vector3Value;

                // label
                width = prefixLabelWidth - margin - leftInset;
                left = leftInset + margin;
                EditorGUI.PrefixLabel(new Rect(rect.x + left, rect.y + margin, width, EditorGUIUtility.singleLineHeight), new GUIContent("Position", "Transform Position"));

                // gui value
                width = EditorGUIUtility.currentViewWidth - prefixLabelWidth - margin * 3 - 22 - leftInset;
                left = leftInset + prefixLabelWidth + margin;
                right = left + width;
                EditorGUI.Vector3Field(new Rect(rect.x + left, rect.y + margin, width, EditorGUIUtility.singleLineHeight), "", position);
            }

            // sceneview rotation
            {
                rect.y += EditorGUIUtility.singleLineHeight;

                // value
                Vector3 rotation = sceneViewRotationProperty.quaternionValue.eulerAngles;

                // label
                width = prefixLabelWidth - margin - leftInset;
                left = leftInset + margin;
                EditorGUI.PrefixLabel(new Rect(rect.x + left, rect.y + margin, width, EditorGUIUtility.singleLineHeight), new GUIContent("Rotation", "Transform Rotation"));

                // gui value
                width = EditorGUIUtility.currentViewWidth - prefixLabelWidth - margin * 3 - 22 - leftInset;
                left = leftInset + prefixLabelWidth + margin;
                right = left + width;
                EditorGUI.Vector3Field(new Rect(rect.x + left, rect.y + margin, width, EditorGUIUtility.singleLineHeight), "", rotation);
            }
        }
        */

        public int Next()
        {
            currentSelectionIndex++;
            if (currentSelectionIndex >= module.GetItemCount() - 1)
                currentSelectionIndex = module.GetItemCount() - 1;

            if (currentSelectionIndex < 0)
                currentSelectionIndex = 0;

            return currentSelectionIndex;
        }

        public int Previous()
        {
            currentSelectionIndex--;
            if (currentSelectionIndex < 0)
                currentSelectionIndex = 0; 

            return currentSelectionIndex;
        }

        public void Reset()
        {
            currentSelectionIndex = 0;
        }

        public int GetCurrentSelectionIndex()
        {
            return currentSelectionIndex;
        }
    }
}